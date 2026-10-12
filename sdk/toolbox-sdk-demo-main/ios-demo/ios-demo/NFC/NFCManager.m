//
//  NFCManager.m
//  device-codec-oc-release_Example
//
//  Created by 郑宗刚 on 2024/8/21.
//  Copyright © 2024 郑宗刚. All rights reserved.
//

#import "NFCManager.h"
#import "NSArray+Slice.h"
#import "nfc_app.h"

static NFCCommand const KNFCMAGIC = @"4d3c2b1a78563412";
static NFCCommand const KNFCVERSION = @"01";

static NFCCommand const KNFCSTATUS_CHECK_COMMAND = @"3AEDED";
static NFCCommand const KNFCREAD_DEVICE_DATA_COMMAND = @"3AF0FF";
static NFCCommand const KNFCSEND_DEVICE_COMMAND = @"A6F0FF";
static NFCCommand const KNFCCOMMAND_PREFIX = @"A6F0FF4d3c2b1a7856341201";

static NFCCommand const KNFCREAD_PKT = @"01";
static NFCCommand const KNFCWRITE_PKT = @"02";

static NFCCommand const KNFCWRITE_FLASH = @"01";
static NFCCommand const KNFCPOWER_ON = @"02";
static NFCCommand const KNFCPOWER_OFF = @"03";

@interface NFCManager()<NFCTagReaderSessionDelegate>

@property (nonatomic, copy) CompleteHandler connectHandler;
@property (nonatomic, strong) dispatch_queue_t taskQueue;
@property (nonatomic, strong) dispatch_queue_t receiveDataQueue;

@end

@implementation NFCManager

+ (NFCCommand)cmdReadFlash {
    return [NSString stringWithFormat:@"%@%@05", KNFCCOMMAND_PREFIX, KNFCREAD_PKT];
}

+ (NFCCommand)cmdReadDeviceData {
    return KNFCREAD_DEVICE_DATA_COMMAND;
}

+ (NFCCommand)cmdReboot {
    return [NSString stringWithFormat:@"%@%@0b00000000313233343536", KNFCCOMMAND_PREFIX, KNFCWRITE_PKT];
}


- (instancetype)init
{
    self = [super init];
    if (self) {
        self.taskQueue = dispatch_queue_create("com.milesight.nfc.taskqueue", DISPATCH_QUEUE_SERIAL);
        self.receiveDataQueue = dispatch_queue_create("com.milesight.nfc.receivedataqueue", DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

+ (instancetype)manager {
    static NFCManager *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[NFCManager alloc] init];
    });
    
    return instance;
}

- (NFCTagReaderSession *)tagSession {
    if (!_tagSession) {
        _tagSession = [[NFCTagReaderSession alloc] initWithPollingOption: NFCPollingISO14443 | NFCPollingISO15693
                                                                delegate:self queue:self.taskQueue];
        _tagSession.alertMessage = @"scan tag ...";
    }
    return _tagSession;
}

- (void)detectAndConnectTag:(CompleteHandler)complete {
    self.connectHandler = complete;
//    [self.tagSession invalidateSession];
    [self.tagSession beginSession];
}

- (void)cancelTechnologyRequest {
    if (_tagSession) {
        [_tagSession invalidateSession];
        _tagSession = nil;
    }
    
//    self. = nil;
}

- (void)read {
    [self cancelTechnologyRequest];
    [self detectAndConnectTag:^(BOOL success, NSError * _Nullable error) {
        if (success) {
            NSLog(@"detect success");
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), self.taskQueue, ^{
                [self sendComand:[NFCManager cmdReadFlash] needPad:true completeHandler:^(NSUInteger ackResult, NSError *error) {
                    NSLog(@"ackResult %lu", ackResult);
                    
                    
                    [self receiveDataLength:ackResult
                            completeHandler:^(NSArray<NSNumber *> *response, NSError *error) {
                        NSLog(@"receive data %@", response);
                        
                        NSArray<NSNumber *> *sliceData = [response sliceFromIndex:0 toIndex:ackResult];
                        NSDictionary *flashInfo = [self getFlashInfo:sliceData];
                        NSLog(@"flashInfo %@", flashInfo);
                        [self cancelTechnologyRequest];
                    }];
                }];
            });
            
        } else {
            _tagSession = nil;
            NSLog(@"detect error");
        }
    }];
}

- (NSDictionary *)getFlashInfo:(NSArray<NSNumber *> *)data {
    int count = (int)[data count];
    char charArray[count];
    int cArray[count];

    for (int i = 0; i < count; ++i) {
        cArray[i] = [[data objectAtIndex:i] intValue];
        charArray[i] = (char)cArray[i] & 0xFF;
    }
    
    char *flashJSONData = get_flash_base_info(charArray, count);
    NSString *jsonStr = [NSString stringWithUTF8String:flashJSONData];
    NSData *jsonData = [jsonStr dataUsingEncoding:NSUTF8StringEncoding];
    
    NSError *error;
    NSDictionary *jsonObject = [NSJSONSerialization JSONObjectWithData:jsonData options:0 error:&error];
    return jsonObject;
}

- (void)sendComand:(NFCCommand)command needPad:(BOOL)needPad completeHandler:(nullable void(^)(NSUInteger, NSError *error))completeHandler {
    //检查可写？
    [self checkWriteableWithCount:4 callback:^(BOOL success, NSError * _Nullable error) {
        if (success) {
            NSLog(@"can write");
            
            //执行command
            [self transceiveCommand:command
                            needPad:YES
                          withCount:4
                     continuesDelay:0.5
                         beginDelay:0
                         checkBlock:^id(NSArray<NSNumber *> *response, NSError *error) {
                if (!error) {
                    NSLog(@"command %@ response %@", command, response);
                    return @(YES);
                }
                
                NSLog(@"command %@ error %@", command, error);
                completeHandler(0, error);
                return NULL;
            }
                  completionHandler:^(NSArray<NSNumber *> *response, NSError *error, id  _Nullable result) {
                if (result) {
                    
                    //检查可读？
                    [self checkReadableWithCount:4 callback:^(BOOL success, NSError * _Nullable error) {
                        if (success) {
                            NSLog(@"can read");
                            
                            
                            //检查ACK回执
                            [self transceive:KNFCREAD_DEVICE_DATA_COMMAND
                           completionHandler:^(NSArray<NSNumber *> *response, NSError *error) {
                                NSLog(@"ack response %@, error %@", response, error);
                                if (!error) {
                                    if (response.count > 9 && [response[9] integerValue] != 0) {
                                        if ([response[9] integerValue] == 3) {
                                            NSLog(@"ack wrong password");
                                        } else {
                                            NSLog(@"ack error");
                                        }
                                    } else {
                                        completeHandler([self getDataLength:response], NULL);
                                    }
                                }
                            }];
                            
                            
                        } else {
                            NSLog(@"can't read");
                            completeHandler(0, error);
                        }
                    }];
                }
            }];
            
        } else {
            NSLog(@"can't write");
            completeHandler(0, error);
        }
    }];
}

- (void)receiveDataLength:(NSUInteger)length completeHandler:(void(^)(NSArray<NSNumber *> *response, NSError *error))completeHandler {
    
    dispatch_async(self.receiveDataQueue, ^{
        NSUInteger sendCount = [self getSendCount:length];
        NSMutableArray *result = [NSMutableArray new];
        __block BOOL success = YES;
        __block NSError *_error = NULL;
        
        
        dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
        for (NSInteger i = 0; i < sendCount; i++) {
            
            if (!success) {
                break;
            }
            
            [self checkReadableWithCount:4 callback:^(BOOL pass, NSError *error) {
                if (pass) {
                    [self transceive:KNFCREAD_DEVICE_DATA_COMMAND
                   completionHandler:^(NSArray<NSNumber *> *response, NSError *error) {
                        if (!error) {
                            NSLog(@"receiveData frame %ld", (long)i);
                            [result addObjectsFromArray:response];
                        } else {
                            success = NO;
                            _error = error;
                            NSLog(@"receive error");
                        }
                        dispatch_semaphore_signal(semaphore);
                    }];
                } else {
                    success = NO;
                    _error = error;
                    dispatch_semaphore_signal(semaphore);
                }
            }];
            dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);
        }
        
        if (!success) {
            completeHandler(NULL, _error);
        } else {
            completeHandler(result, NULL);
        }
    });
}

- (void)checkWriteableWithCount:(NSInteger)count callback:(CompleteHandler)callback {
    [self statusCheck:^BOOL(NSArray<NSNumber *> *response, NSError *error) {
        NSLog(@"writeable response %@ error %@", response, error);
        return [self writeable:response];
    }
            WithCount:count
       continuesDelay:0.05
           beginDelay:0
             callback:callback];
}

- (void)checkReadableWithCount:(NSInteger)count callback:(CompleteHandler)callback {
    [self statusCheck:^BOOL(NSArray<NSNumber *> *response, NSError *error) {
        NSLog(@"readable response %@ error %@", response, error);
        return [self readable:response];
    }
            WithCount:count
       continuesDelay:0.05
           beginDelay:0
             callback:callback];
}

- (void)statusCheck:(BOOL(^)(NSArray<NSNumber *> *response, NSError *error))check
          WithCount:(NSInteger)count
     continuesDelay:(CGFloat)continuesDelay
         beginDelay:(CGFloat)beginDelay
           callback:(CompleteHandler)callback {
    [self transceiveCommand:KNFCSTATUS_CHECK_COMMAND
                  withCount:count
             continuesDelay:continuesDelay
                 beginDelay:beginDelay
                 checkBlock:^id(NSArray<NSNumber *> *response, NSError *error) {
        if (check(response, error)) {
            return @(YES);
        } else {
            NSLog(@"read error try again %@", error);
            return NULL;
        }
    }
          completionHandler:^(NSArray<NSNumber *> *response, NSError *error, id result) {
        if (result) {
            callback(YES, error);
        } else {
            callback(NO, error);
        }
    }];
}

- (void)transceiveCommand:(NFCCommand)command
               withCount:(NSInteger)count
           continuesDelay:(CGFloat)continuesDelay
               beginDelay:(CGFloat)beginDelay
              checkBlock:( nullable id (^)(NSArray<NSNumber *> *response, NSError *error))checkBlock
        completionHandler:(void (^)(NSArray<NSNumber *> *response, NSError *error, __nullable id result))handler {
    [self transceiveCommand:command needPad:NO withCount:count continuesDelay:continuesDelay beginDelay:beginDelay checkBlock:checkBlock completionHandler:handler];
}


- (void)transceiveCommand:(NFCCommand)command
                  needPad:(BOOL)needPad
               withCount:(NSInteger)count
           continuesDelay:(CGFloat)continuesDelay
               beginDelay:(CGFloat)beginDelay
              checkBlock:( nullable id (^)(NSArray<NSNumber *> *response, NSError *error))checkBlock
       completionHandler:(void (^)(NSArray<NSNumber *> *response, NSError *error, __nullable id result))handler {
    void (^excuteBlock)(void) = ^{
        [self transceive:command
                 needPad:needPad
       completionHandler:^(NSArray<NSNumber *> *response, NSError *error) {
            id result = checkBlock(response, error);
            if (result || count <= 0) {
                handler(response, error, result);
            } else {
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(continuesDelay * NSEC_PER_SEC)), self.taskQueue, ^{
                    
                    [self transceiveCommand:command
                                    needPad:needPad
                                  withCount:count - 1
                             continuesDelay:continuesDelay
                                 beginDelay:0
                                 checkBlock:checkBlock
                          completionHandler:handler];
                });
            }
        }];
    };
    
    if (beginDelay > 0) {
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(beginDelay * NSEC_PER_SEC)), self.taskQueue, ^{
            NSLog(@"begin delay with command %f", beginDelay);
            excuteBlock();
        });
    } else {
        excuteBlock();
    }
}

- (BOOL)writeable:(NSArray<NSNumber *> *)response {
    if ([response count] >= 2) {
        NSInteger status = [response[2] integerValue];
        if ((status & 0x21) == 33) {
            NSLog(@"write response %@", response);
            return YES;
        }
    }
    
    return NO;
}

- (BOOL)readable:(NSArray<NSNumber *> *)response {
    if ([response count] >= 2) {
        NSInteger status = [response[2] integerValue];
        if (status == 41) {
            return YES;
        }
    }
    
    return NO;
}


- (void)transceive:(NFCCommand)command
            needPad:(BOOL)needPad
  completionHandler:(void(^)(NSArray* response, NSError* error))completionHandler {
    if (self.tagSession.connectedTag) {
        
        id<NFCMiFareTag> mifareTag = [self.tagSession.connectedTag asNFCMiFareTag];
        NSArray *bytes = [self encodeCommand:command needPad:needPad];
        NSData *data = [self arrayToData:bytes];
        if (mifareTag) {
            [mifareTag sendMiFareCommand:data
                       completionHandler:^(NSData * _Nonnull response, NSError * _Nullable error) {
                if (error) {
                    NSLog(@"transceive error %@ %@ %@", command, bytes, error);
                    completionHandler(nil, error);
                } else {
                    NSLog(@"transceive success %@  %@ %@", command, bytes, error);
                    completionHandler([self dataToArray:response], nil);
                }
            }];
        }
    }
   
}

- (void)transceive:(NFCCommand)command
  completionHandler:(void(^)(NSArray<NSNumber *> * response, NSError* error))completionHandler {
    [self transceive:command needPad:false completionHandler:completionHandler];
}

- (void)tagReaderSession:(NFCTagReaderSession *)session didDetectTags:(NSArray<__kindof id<NFCTag>> *)tags {
    for (id<NFCTag> tag in tags) {
        if (tag.type == NFCTagTypeMiFare) {
            [self.tagSession connectToTag:tag completionHandler:^(NSError * _Nullable error) {
                if (error != nil) {
                    
                    [self.tagSession restartPolling];
                    return;
                }
                
                NSLog(@"tag %@", [self getHexString:[self.tagSession.connectedTag asNFCMiFareTag].identifier]);
                
                if (self.tagSession.connectedTag) {
                    id<NFCNDEFTag> tag = [self.tagSession.connectedTag asNFCMiFareTag];
                    [tag readNDEFWithCompletionHandler:^(NFCNDEFMessage * _Nullable message, NSError * _Nullable error) {
                        if (!error) {
                            self.connectHandler(YES, error);
                        } else {
                            self.connectHandler(YES, error);
                            NSLog(@"read ndef error %@", error);
                        }
                    }];
                }
                
                
            }];
        }
    }
}

- (void)tagReaderSession:(nonnull NFCTagReaderSession *)session didInvalidateWithError:(nonnull NSError *)error {
    self.connectHandler(NO, error);
    if (error.code == NFCReaderSessionInvalidationErrorFirstNDEFTagRead) {
        NSLog(@"第一个标签读取后会话无效");
    } else {
        NSLog(@"会话无效: %@", error.localizedDescription);
    }
    
}

#pragma helper

- (NSArray<NSNumber *> *)encodeCommand:(NFCCommand)command
                   needPad:(BOOL)needPad {
    NSString *hexString = command;
    if (needPad) {
        hexString = [self padStringToLength:hexString length:134 padChar:'0'];
    }
    
    NSLog(@"hexString %@", hexString);
    return [self hexStringToDecimalArray:hexString];
}

- (NSData *)arrayToData:(NSArray *)array {
    Byte bytes[[array count]];
    for (int i = 0; i < [array count]; i++) {
        bytes[i] = [[array objectAtIndex:i] integerValue];
    }
    NSData *payload = [[NSData alloc] initWithBytes:bytes length:[array count]];
    return payload;
}

- (NSString*)getHexString:(NSData *)data {
    NSUInteger capacity = data.length * 2;
    NSMutableString *sbuf = [NSMutableString stringWithCapacity:capacity];
    const unsigned char *buf = data.bytes;
    NSInteger i;
    for (i=0; i<data.length; ++i) {
        [sbuf appendFormat:@"%02lX", (unsigned long)buf[i]];
    }
    return sbuf;
}


- (NSString *)padStringToLength:(NSString *)inputString
                         length:(NSUInteger)desiredLength
                        padChar:(unichar) padChar {
    if ([inputString length] < desiredLength) {
        NSUInteger paddingLength = desiredLength - [inputString length];
        NSString *paddingString = [@"" stringByPaddingToLength:paddingLength withString:[NSString stringWithCharacters:&padChar length:1] startingAtIndex:0];
        inputString = [inputString stringByAppendingString:paddingString];
    }
    return inputString;
}

- (NSArray<NSNumber *> *)hexStringToDecimalArray:(NSString *)hexString {
    NSMutableArray<NSNumber *> *decimalArray = [NSMutableArray array];
    for (NSUInteger i = 0; i < [hexString length]; i += 2) {
        NSString *hexPair = [hexString substringWithRange:NSMakeRange(i, 2)];
        unsigned int decimalValue;
        [[NSScanner scannerWithString:hexPair] scanHexInt:&decimalValue];
        [decimalArray addObject:@(decimalValue)];
    }
    return [decimalArray copy];
}

-(NSArray<NSNumber *> *)dataToArray:(NSData *)data {
    const unsigned char *dataBuffer = data ? (const unsigned char *)[data bytes] : NULL;
    
    if (!dataBuffer)
        return @[];
    
    NSUInteger dataLength = [data length];
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:dataLength];
    
    for (int i = 0; i < dataLength; ++i)
        [array addObject:[NSNumber numberWithInteger:dataBuffer[i]]];
    
    return array;
}

- (NSUInteger)getDataLength:(NSArray<NSNumber *> *) data{
    if (data.count < 14) {
        NSLog(@"Data length is too short.");
        return 0;
    }
    
    // 获取从第10个元素开始的4个元素
    uint8_t bytes[4];
    for (int i = 0; i < 4; i++) {
        bytes[i] = [data[10 + i] unsignedCharValue];
    }
    
    // 将字节数据组合成 uint32_t
    uint32_t length = *((uint32_t *)bytes);
    
    // 将数据从小端格式转换为主机字节顺序
    length = CFSwapInt32LittleToHost(length);
    
    return length;
}

- (NSUInteger)getSendCount:(NSUInteger)dataLength {
    return (NSUInteger)ceil((double)dataLength / 64.0);
}

@end


