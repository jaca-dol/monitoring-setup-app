//
//  NFCService.m
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/17.
//

#import "NFCService.h"
#import "NFCCore.h"
#import <CoreNFC/CoreNFC.h>
#import "NFCComandConstant.h"
#import "nfc_app.h"
#import "DeviceUtil.h"
#import "NSArray+Slice.h"

NSString* const APP_NFC_MAGIC = @"4d3c2b1a78563412";
NSString* const APP_NFC_VERSION = @"01";

NSString* const APP_NFC_STATUS_CHECK_COMMAND = @"3AEDED";
NSString* const APP_NFC_READ_DEVICE_DATA_COMMAND = @"3AF0FF";
NSString* const APP_NFC_SEND_DEVICE_COMMAND = @"A6F0FF";
NSString* APP_NFC_COMMAND_PREFIX(void) {
    return [NSString stringWithFormat:@"%@%@%@", APP_NFC_SEND_DEVICE_COMMAND, APP_NFC_MAGIC, APP_NFC_VERSION];
}
NSString* const APP_NFC_WRITE_CARD_DATA_COMMAND = @"A2";
NSString* const APP_NFC_READ_CARD_DATA_COMMAND = @"3A";

NSString* const APP_NFC_READ_PKT = @"01";
NSString* const APP_NFC_WRITE_PKT = @"02";

NSString* const APP_NFC_WRITE_FLASH = @"01";
NSString* const APP_NFC_POWER_ON = @"02";
NSString* const APP_NFC_POWER_OFF = @"03";
NSString* const APP_NFC_UPGRADE = @"04";
@interface NFCService()

@property (nonatomic, strong) NFCCore *core;
@property (nonatomic, strong) id<NFCNDEFTag>tag;
@property (nonatomic, assign) NSUInteger progress;
@property (nonatomic, assign) NSUInteger totalProgress;

@end

@implementation NFCService

- (instancetype)init {
    self = [super init];
    if (self) {
        self.core = [NFCCore sharedInstance];
        self.progress = 0;
        self.totalProgress = 100;
        [self addObserver:self forKeyPath:@"progress" options:NSKeyValueObservingOptionNew context:nil];

    }
    
    return self;
}

- (void)writeFlash:(NSDictionary *)settingJSON newDeviceSettingInfo:(NSDictionary *)newDeviceSettingInfo rawData:(NSArray *)rawData callback:(void(^)(Boolean success))callback {
    if ([rawData count] == 0) {
        NSLog(@"raw data is empty");
        callback(NO);
        return;
    }

    [self startDetectionWithCallback:^(Boolean success) {
        if (success) {
            NSDictionary *flashInfo = [DeviceUtil setFlashInfo:rawData withJSON:[DeviceUtil dictionaryToJsonString:settingJSON]];
            if ([flashInfo objectForKey:@"code"] && [[flashInfo objectForKey:@"code"] integerValue] == 1) {
                NSArray *newRawData = [flashInfo objectForKey:@"rawData"];
                NSDictionary *resultDict = [DeviceUtil dictionaryFromJsonString:[flashInfo objectForKey:@"result"]];
                NSUInteger dataSize = [[resultDict objectForKey:@"datasize"] integerValue];
                NSLog(@"write flash result %ld", dataSize);
                [self sendCommand:NFC_COMMAND_WRITE_FLASH data:@{@"datasize": @(dataSize), @"password": @"123456"} callback:^(Boolean success, NSUInteger length) {
                    if (success) {
                        [self sendFlashData:newRawData dataSize:dataSize callback:^(Boolean success) {
                            if (success) {
                                [self checkReadableWithCallback:^(Boolean success) {
                                    if (success) {
                                        [self checkWriteSuccessWithCallback: ^(Boolean success) {
                                            if (success) {
                                                NSLog(@"check write success success");
                                                callback(YES);
                                            } else {
                                                NSLog(@"check write success failed");                                                
                                                callback(NO);
                                            }
                                            [self.core cancelTechnologyRequest];
                                        }];
                                    } else {
                                        NSLog(@"check readable failed");
                                        [self.core cancelTechnologyRequest];
                                        callback(NO);
                                    }
                                }];
                            } else {
                                NSLog(@"send flash data failed");
                                [self.core cancelTechnologyRequest];
                                callback(NO);
                            }
                        }];
                    }
                }];
            } else {
                NSLog(@"write flash failed %@", flashInfo);
                [self.core cancelTechnologyRequest];
                callback(NO);
            }
        }
    }];
}

- (void)sendFlashData:(NSArray *)data dataSize:(NSUInteger)dataSize callback:(void(^)(Boolean success))callback {
    NSArray *sendData = [self hexArrToDecimalArr:data];
    NSArray *sendDataPrefix = [self encodeCommand:APP_NFC_SEND_DEVICE_COMMAND needPad:NO];
    NSUInteger sendCount = [self getSendCount:dataSize];
    self.totalProgress = sendCount * 2;
    NSLog(@"send flash data send count %ld", sendCount);


    [self sendFlashDataWithCount:sendCount index:0 data:sendData prefix:sendDataPrefix callback:callback];
}

- (void)sendFlashDataWithCount:(NSUInteger)count index:(NSUInteger)index data:(NSArray *)data prefix:(NSArray *)prefix callback:(void(^)(Boolean success))callback {
    if (index >= count) {
        callback(YES);
        return;
    }
    NSArray *suffixData = [data safeSubarrayFromRange:NSMakeRange(index * 64, 64)];
    NSMutableArray *transceiveData = [[prefix arrayByAddingObjectsFromArray:suffixData] mutableCopy];
    while (transceiveData.count < 67) {
        [transceiveData addObject:@0];
    }

    [self checkWriteableWithCallback:^(Boolean success) {
        self.progress += 1;
        if (success) {
            [self createCheckFunc:transceiveData checkCondition:^Boolean(NSArray *response) {
                return [response count] > 0;
            } callback:^(NSArray *response, NSString* _Nullable errorMessage) {
                self.progress += 1;
                if ([response count] > 0) {
                    [self sendFlashDataWithCount:count index:index + 1 data:data prefix:prefix callback:callback];   
                } else {
                    NSLog(@"send flash data failed");
                    callback(NO);
                }
            }];
        } else {
            NSLog(@"check writeable failed");
            callback(NO);
        }
    }];
}

- (void)readFlashWithCallback:(void(^)(Boolean success, NSDictionary *flashInfo, NSArray *flashData))callback {
    [self startDetectionWithCallback:^(Boolean success) {
        if (success) {
            [self sendCommand:NFC_COMMAND_READ_FLASH callback:^(Boolean success, NSUInteger length) {
                if (success) {
                    [self receiveDataWithLength:length callback:^(NSArray *response) {
                        if (response) {
                            NSLog(@"receive total data %@", response);
                            NSLog(@"complete");
                            NSArray *sliceData = [response safeSubarrayFromRange:NSMakeRange(0, length)];
                            NSArray *rawData = [sliceData safeSubarrayFromRange:NSMakeRange(128, sliceData.count - 128)];
                            NSDictionary *flashInfo = [DeviceUtil getFlashInfo:sliceData];
                            callback(YES, flashInfo, rawData);                            
                        } else {
                            callback(NO, nil, nil);                            
                        }
                        [self.core cancelTechnologyRequest];
                    }];
                }
            }];
        } else {
            [self.core cancelTechnologyRequest];
            callback(NO, nil, nil);
        }
    }];
}

- (void)receiveDataWithCount:(NSUInteger)count result:(NSMutableArray *)result callback:(void(^)(NSArray *response))callback {
    if (count <= 0) {
        callback(result);
        return;
    }
    __weak typeof(self) weakSelf = self;
    [self checkReadableWithCallback:^(Boolean success) {
        self.progress += 1;
        if (success) {
            __strong typeof(self) strongSelf = weakSelf;
            [strongSelf.core sendMifareCommand:[strongSelf getCommandBytes:NFC_COMMAND_RECEIVE_DATA] callback:^(Boolean success, NSArray *response, NSString* _Nullable errorMessage) {
                self.progress += 1;
                if (success) {
                    __weak typeof(self) weakSelf = self;
                    NSLog(@"receive data %@", response);
                    [result addObjectsFromArray:response];
                    [weakSelf receiveDataWithCount:count - 1 result:result callback:callback];
                } else {
                    NSLog(@"receive data failed");
                    callback(nil);   
                }
            }];
        }
    }];
}

- (void)receiveDataWithLength:(NSUInteger)length callback:(void(^)(NSArray *response))callback {
    NSUInteger sendCount = [self getSendCount:length];
    NSLog(@"receive data send count %ld", sendCount);
    self.totalProgress = sendCount * 2;
   [self receiveDataWithCount:sendCount result:[NSMutableArray array] callback:callback];
}

- (NSUInteger)getSendCount:(NSUInteger)length {
    return (NSUInteger)ceil((double)length / 64.0);
}


- (void)startDetectionWithCallback:(void(^)(Boolean success))callback {
    self.progress = 0;
    [self.core cancelTechnologyRequest];
    NSLog(@"start detection");
    __weak typeof(self) weakSelf = self;
    [self.core requestTechnology:@[@(NFCTagTypeMiFare)] callback:^(Boolean isSuccess) {
        __strong typeof(self) strongSelf = weakSelf;
        if (isSuccess) {
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.3 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                strongSelf.tag = [strongSelf.core getTag];
                NSLog(@"tag %@", strongSelf.tag);
                callback(YES);
            });
        } else {
            [strongSelf.core cancelTechnologyRequest];
            NSLog(@"detection failed");
            callback(NO);
        }
    }];
}

- (void)sendCommand:(NSString *)command data:(NSDictionary *)data callback:(void(^)(Boolean success, NSUInteger length))callback {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.3 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        // check writeable
        [self checkWriteableWithCallback:^(Boolean success) {
            if (success) {
                // send command
                NSArray *commandBytes = [self getCommandBytes:command data:data];
                NSLog(@"cmdName %@ send command %@", command, commandBytes);
                [self createCheckFunc:commandBytes checkCondition:^Boolean(NSArray *response) {
                    return [response count] > 0;
                } callback:^(NSArray *response, NSString* _Nullable errorMessage) {
                    if ([response count] > 0) {
                        // check readable
                        [self checkReadableWithCallback:^(Boolean success) {
                            if (success) {
                                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.3 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                                    [self getAckDataLengthWithCallback:^(NSInteger length) {
                                        if (length >= 0) {
                                            NSLog(@"get ack data length %ld", length);
                                            callback(YES, length);
                                        } else {
                                            NSLog(@"get ack data length failed");
                                            callback(NO, 0);
                                        }
                                    }];
                                });
                            } else {
                                NSLog(@"check readable failed");
                                callback(NO, 0);
                            }
                        }];
                    } else {
                        NSLog(@"send command failed");
                        callback(NO, 0);
                    }
                }];
            } else {
                NSLog(@"check writeable failed");
                callback(NO, 0);
            }
        }];
    });
}

- (void)sendCommand:(NSString *)command callback:(void(^)(Boolean success, NSUInteger length))callback {
    [self sendCommand:command data:nil callback:callback];
}

- (void)getAckDataLengthWithCallback:(void(^)(NSInteger length))callback {
    [self createCheckFunc:[self getCommandBytes:NFC_COMMAND_ACK] checkCondition:^Boolean(NSArray *response) {
        NSLog(@"ack response %@", response);
        if ([response count] >= 10 && [response[9] integerValue] != 0) {
            if ([response[9] integerValue] == 3) {
                NSLog(@"wrong password");
            } else if ([response[9] integerValue] == 9) {
                NSLog(@"stuck in bootloader");
            } else if ([response[9] integerValue] == 8) {
                NSLog(@"collecting");
            } else {
                NSLog(@"ack error");
            }
            return NO;
        }
        return YES;
    } callback:^(NSArray *response, NSString* _Nullable errorMessage) {
        if ([response count] >= 14) {
            uint32_t length = [self getDataLength:response];
            callback(length);
        } else {
            callback(-1);
        }
    }];
}

- (uint32_t)getDataLength:(NSArray<NSNumber *> *)data {
    uint8_t bytes[4];

    for (int i = 0; i < 4; i++) {
        bytes[i] = [data[10 + i] unsignedCharValue];
    }

    uint32_t value = 0;
    memcpy(&value, bytes, 4);

    return CFSwapInt32LittleToHost(value);
}


/**
 * 检查设备是否可写
 */
- (void)checkWriteableWithCallback:(void(^)(Boolean success))callback {
    NSLog(@"check writeable");
	[self createCheckFunc:[self getCommandBytes:NFC_COMMAND_WRITEABLE] checkCondition:^Boolean(NSArray *response) {
		return [response count] >= 2 && ([response[2] integerValue] & 0x21) == 33;
	} callback:^(NSArray *response, NSString* _Nullable errorMessage) {
        NSLog(@"check writeable response %@", response);
		callback([response count] >= 0);
	}];
}

- (void)checkWriteSuccessWithCallback:(void(^)(Boolean success))callback {
    NSArray *commandBytes = [self getCommandBytes:NFC_COMMAND_ACK];
    [self.core sendMifareCommand:commandBytes callback:^(Boolean success, NSArray *response, NSString* _Nullable errorMessage) {
        if (success) {
            if ([response count] >= 10 && [response[9] integerValue] != 0) {
                NSLog(@"some error");
                callback(NO);
            } else if ([response count] > 1 && [response[1] integerValue] != 60) {
                NSLog(@"ack error");
                callback(NO);
            } else {
                callback(YES);
            }
        }
    }];
   
}

/**
 * 检查设备是否可读
 */
- (void)checkReadableWithCallback:(void(^)(Boolean success))callback {
    NSLog(@"check readable");
	[self createCheckFunc:[self getCommandBytes:NFC_COMMAND_READABLE] checkCondition:^Boolean(NSArray *response) {
		return [response count] > 2 && ([response[2] integerValue] & 0x29) == 41;
	} callback:^(NSArray *response, NSString* _Nullable errorMessage) {
        NSLog(@"check readable response %@", response);
		callback([response count] >= 0);
	}];
}

- (void)createCheckFunc:(NSArray *)bytes checkCondition:(Boolean(^)(NSArray *response))condition callback:(void(^)(NSArray *response, NSString* _Nullable errorMessage))callback {
    [self.core sendMifareCommand:bytes callback:^(Boolean success, NSArray *response, NSString* _Nullable errorMessage) {
        if (success) {
            if (condition(response)) {
                callback(response, errorMessage);
            } else {
                [self createCheckFunc:bytes checkCondition:condition callback:callback];
            }
        } else {
            callback(nil, errorMessage);
        }
    }];
}

- (NSArray *)hexStrToDecimalArr:(NSString *)hexString {
    NSMutableArray<NSNumber *> *result = [NSMutableArray array];

    // Ensure even length
    if (hexString.length % 2 != 0) {
        hexString = [@"0" stringByAppendingString:hexString];
    }

    for (NSUInteger i = 0; i < hexString.length; i += 2) {
        NSString *byteStr = [hexString substringWithRange:NSMakeRange(i, 2)];

        unsigned int value = 0;
        NSScanner *scanner = [NSScanner scannerWithString:byteStr];
        [scanner scanHexInt:&value];

        [result addObject:@(value)];
    }

    return result;
}

- (NSArray<NSNumber *> *)hexArrToDecimalArr:(NSArray *)data {
    NSMutableArray<NSNumber *> *result = [NSMutableArray array];

    for (id item in data) {

        if ([item isKindOfClass:[NSNumber class]]) {
            // Already numeric → push directly
            [result addObject:item];
        }
        else if ([item isKindOfClass:[NSString class]]) {
            // Convert hex string
            unsigned int value = 0;
            NSScanner *scanner = [NSScanner scannerWithString:(NSString *)item];
            [scanner scanHexInt:&value];
            [result addObject:@(value)];
        }
        else {
            // Unsupported type → ignore or push 0
            NSLog(@"Unsupported item type: %@", item);
        }
    }

    return result;
}

- (NSArray *)getCommandBytes:(NSString *)command data:(NSDictionary *)data {
    if ([command isEqualToString:NFC_COMMAND_WRITEABLE]) {
        return [self encodeCommand:APP_NFC_STATUS_CHECK_COMMAND needPad:NO];
    } else if ([command isEqualToString:NFC_COMMAND_READABLE]) {
        return [self encodeCommand:APP_NFC_STATUS_CHECK_COMMAND needPad:NO];
    } else if ([command isEqualToString:NFC_COMMAND_ACK]) {
        return [self encodeCommand:APP_NFC_READ_DEVICE_DATA_COMMAND needPad:NO];
    } else if ([command isEqualToString:NFC_COMMAND_RECEIVE_DATA]) {
        return [self encodeCommand:APP_NFC_READ_DEVICE_DATA_COMMAND needPad:NO];
    } else if ([command isEqualToString:NFC_COMMAND_READ_FLASH]) {
        return [self encodeCommand:[NSString stringWithFormat:@"%@%@05", APP_NFC_COMMAND_PREFIX(), APP_NFC_READ_PKT] needPad:YES];
    } else if ([command isEqualToString:NFC_COMMAND_WRITE_FLASH]) {
        NSInteger dataSize = [[data objectForKey:@"datasize"] integerValue];
        NSString *password = [data objectForKey:@"password"];
        NSString *command = [NSString stringWithFormat:@"%@%@%@%@0000%@", APP_NFC_COMMAND_PREFIX(), APP_NFC_WRITE_PKT, APP_NFC_WRITE_FLASH, [self convertNumber:dataSize size:nil], [self strToCharCodeHexStr:password needReverse:NO]];
        return [self encodeCommand:command needPad:YES];
    }
    return nil;
}

- (NSArray *)getCommandBytes:(NSString *)command {
    return [self getCommandBytes:command data:nil];
}

- (NSArray *)encodeCommand:(NSString *)command needPad:(BOOL)needPad {
    NSString *paddedCommand = needPad ? [self padCommand:command padString:@"0" targetLength:134] : command;
	return [self hexStrToDecimalArr:paddedCommand];
}
- (NSString *)padCommand:(NSString *)command padString:(NSString *)padString targetLength:(NSInteger)targetLength {
	return padString.length < targetLength ? [command stringByPaddingToLength:targetLength withString:padString startingAtIndex:0] : command;
}

- (NSString *)convertNumber:(NSInteger)number size:(NSNumber * _Nullable)size {
    NSUInteger numberSize;

    if (size != nil) {
        numberSize = size.unsignedIntegerValue;
    } else {
        if (number >= 0 && number <= 255) {
            numberSize = 1;
        } else if (number > 32767) {
            numberSize = 4;
        } else {
            numberSize = 2;
        }
    }

    // Always signed (like TS)
    return [self numberToHexStr:number size:numberSize sign:YES];
}

- (NSString *)strToCharCodeHexStr:(NSString *)str needReverse:(BOOL)needReverse {
    NSMutableArray<NSString *> *hexArr = [NSMutableArray array];
    
    for (NSUInteger i = 0; i < str.length; i++) {
        unichar ch = [str characterAtIndex:i];
        [hexArr addObject:[NSString stringWithFormat:@"%x", ch]];
    }
    
    if (needReverse) {
        NSArray *reversed = [[hexArr reverseObjectEnumerator] allObjects];
        hexArr = [reversed mutableCopy];
    }

    return [hexArr componentsJoinedByString:@""];
}


- (NSString *)numberToHexStr:(NSInteger)num
                        size:(NSUInteger)size
                        sign:(BOOL)sign
{
    uint8_t bytes[4] = {0};

    if (size == 4) {
        if (sign) {
            int32_t val = (int32_t)num;
            memcpy(bytes, &val, 4); // little-endian memory layout
        } else {
            uint32_t val = (uint32_t)num;
            memcpy(bytes, &val, 4);
        }
    }
    else if (size == 2) {
        if (sign) {
            int16_t val = (int16_t)num;
            memcpy(bytes, &val, 2);
        } else {
            uint16_t val = (uint16_t)num;
            memcpy(bytes, &val, 2);
        }
    }
    else if (size == 1) {
        if (sign) {
            int8_t val = (int8_t)num;
            memcpy(bytes, &val, 1);
        } else {
            uint8_t val = (uint8_t)num;
            memcpy(bytes, &val, 1);
        }
    }

    // convert to hex string
    NSMutableString *hexStr = [NSMutableString string];
    for (int i = 0; i < size; i++) {
        [hexStr appendFormat:@"%02x", bytes[i]];
    }

    return hexStr;
}


- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary *)change
                       context:(void *)context {
    if ([keyPath isEqualToString:@"progress"]) {
        NSUInteger currentProgress = [change[NSKeyValueChangeNewKey] integerValue];
        CGFloat currentPercent = ceil((CGFloat)currentProgress / (CGFloat)self.totalProgress * 100);
        [self.core setAlertMessage:[NSString stringWithFormat:@"%.0f", currentPercent]];
    }
}


@end

