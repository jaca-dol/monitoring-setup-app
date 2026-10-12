//
//  NFCCore.m
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/17.
//

#import "NFCCore.h"

NSNotificationName const NfcManagerDiscoverTag = @"NfcManagerDiscoverTag";
NSNotificationName const NfcManagerSessionClosed = @"NfcManagerSessionClosed";

@interface NFCCore()

@property (nonatomic, copy) NSDictionary *nfcTechTypes;
@property (nonatomic, copy) NSArray<NSNumber *> *techRequestTypes;
@property (nonatomic, strong) id<NFCNDEFTag> connectedNdefTag;
@property (nonatomic, copy) TechReuestCallBackType techRequestCallback;
@property (nonatomic, assign) Boolean cleanUpTagRegistration;


@end

@implementation NFCCore

+ (instancetype)sharedInstance {
    static NFCCore *shared = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        shared = [[self alloc] init];
    });
    return shared;
}

- (instancetype)init {
    if (self = [super init]) {
        NSLog(@"NfcManager created");
    }
    
    self.cleanUpTagRegistration = false;
    return self;
}

- (void)reset
{
    self.session = nil;
    self.sessionEx = nil;
//    self.techRequestTypes = nil;
    self.connectedNdefTag = nil;
}

- (void)cancelTechnologyRequest
{
    if (!self.cleanUpTagRegistration) {
        return;
    }
    self.cleanUpTagRegistration = false;
    if ([self unregisterTagEventEx]) {
        self.techRequestCallback = nil;
    }
}

- (void)requestTechnology:(NSArray<NSNumber *> *)techs callback:(nonnull TechReuestCallBackType)callback
{

    [self registerTagEventEx:@{
        @"alertMessage": @"scan tag ...",
        @"invalidateAfterFirstRead": @NO,
        @"isReaderModeEnabled": @NO,
        @"readerModeFlags": @0
    }];

    self.cleanUpTagRegistration = true;

    if (self.sessionEx == nil) {        
        NSLog(@"you need to call registerTagEventEx first");
        callback(false);
        return;
    }
    
    if (self.techRequestCallback == nil) {
        self.techRequestTypes = techs;
        self.techRequestCallback = callback;
    } else {
        NSLog(@"duplicate tech request, please call cancelTechnologyRequest to cancel previous one");
        callback(false);
    }
}


- (id<NFCNDEFTag>)getNDEFTagHandle:(id<NFCTag>)tag {
    // all following types inherite from NFCNDEFTag
    if (@available(iOS 13.0, *)) {
        if (tag.type == NFCTagTypeMiFare) {
            return [tag asNFCMiFareTag];
        } else if (tag.type == NFCTagTypeISO7816Compatible) {
            return [tag asNFCISO7816Tag];
        } else if (tag.type == NFCTagTypeISO15693) {
            return [tag asNFCISO15693Tag];
        } else if (tag.type == NFCTagTypeFeliCa) {
            return [tag asNFCFeliCaTag];
        }
    }

    return nil;
}

- (id<NFCNDEFTag>)getTag
{
    if (@available(iOS 13.0, *)) {        
        id<NFCNDEFTag> ndefTag = nil;
        
        if (self.session != nil) {
            if (self.connectedNdefTag) {
                ndefTag = self.connectedNdefTag;
            }
        } else if (self.sessionEx != nil) {
            if (self.sessionEx.connectedTag) {
                ndefTag = [self getNDEFTagHandle:self.sessionEx.connectedTag];
            }
        } else {
            NSLog(@"No session available");
            return nil;
        }
        
        return ndefTag;
    } else {
        NSLog(@"Not support in this device");
        return nil;
    }
}

- (Boolean)registerTagEventEx:(NSDictionary *)options
{
    if (@available(iOS 13.0, *)) {
        if (self.sessionEx == nil) {
            self.sessionEx = [[NFCTagReaderSession alloc]
                         initWithPollingOption:(NFCPollingISO14443 | NFCPollingISO15693 | NFCPollingISO15693 | NFCPollingISO18092) delegate:self queue:dispatch_get_main_queue()];
            self.sessionEx.alertMessage = [options objectForKey:@"alertMessage"];
            [self.sessionEx beginSession];
            return true;
        } else {
            NSLog(@"Duplicated registration");
            return false;
        }
    } else {
        NSLog(@"Not support in this device");
        return false;
    }
}

- (Boolean)unregisterTagEventEx
{
    
    if (@available(iOS 13.0, *)) {
        if (self.sessionEx != nil) {
            NSLog(@"unregisterTag");
            [self.sessionEx invalidateSession];
            return true;
        } else {
            NSLog(@"Not even registered");
            return false;
        }
    } else {
        NSLog(@"Not support in this device");
        return false;
    }
}


- (void)sendMifareCommand:(NSArray *)bytes callback:(void(^)(Boolean success, NSArray *response, NSString* _Nullable errorMessage))callback
{
    if (@available(iOS 13.0, *)) {
        if (self.sessionEx != nil) {
            if (self.sessionEx.connectedTag) {
                id<NFCMiFareTag> mifareTag = [self.sessionEx.connectedTag asNFCMiFareTag];
                NSData *data = [self arrayToData:bytes];
                NSLog(@"input bytes: %@, mifareTag: %@", [NFCCore getHexString:data], mifareTag);
                if (mifareTag) {
                    [mifareTag sendMiFareCommand:data
                               completionHandler:^(NSData *response, NSError *error) {
                        if (error) {
                            NSString *errorMessage = [NFCCore getErrorMessage:error];
                            callback(false, nil, errorMessage);
                        } else {
                            callback(true, [self dataToArray:response], nil);
                        }
                    }];
                    return;
                } else {
                    callback(false, nil, @"not a mifare tag");
                }
            }
            NSLog(@"Not connected");
            callback(false, nil, @"not connected");
        } else {
            NSLog(@"Not even registered");
            callback(false, nil, @"not even registered");
        }
    } else {
        NSLog(@"Not support in this device");
        callback(false, nil, @"not support in this device");
    }
}

#pragma helper

- (NSArray<NSString *> *)supportedEvents
{
    return @[
             @"NfcManagerDiscoverTag",
             @"NfcManagerSessionClosed"
             ];
}

- (NSData *)arrayToData: (NSArray *) array
{
  Byte bytes[[array count]];
  for (int i = 0; i < [array count]; i++) {
    bytes[i] = [[array objectAtIndex:i] integerValue];
  }
  NSData *payload = [[NSData alloc] initWithBytes:bytes length:[array count]];
  return payload;
}

- (NSArray *)dataToArray:(NSData *)data
{
    const unsigned char *dataBuffer = data ? (const unsigned char *)[data bytes] : NULL;
    
    if (!dataBuffer)
        return @[];
    
    NSUInteger dataLength = [data length];
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:dataLength];
    
    for (int i = 0; i < dataLength; ++i)
        [array addObject:[NSNumber numberWithInteger:dataBuffer[i]]];
    
    return array;
}

- (NSDictionary*)convertNdefRecord:(NFCNDEFPayload *) record
{
    return @{
             @"id": [self dataToArray:[record identifier]],
             @"payload": [self dataToArray: [record payload]],
             @"type": [self dataToArray:[record type]],
             @"tnf": [NSNumber numberWithInt:[record typeNameFormat]]
             };
}

- (NSArray*)convertNdefMessage:(NFCNDEFMessage *)message
{
    NSArray * records = [message records];
    NSMutableArray *resultArray = [NSMutableArray arrayWithCapacity: [records count]];
    for (int i = 0; i < [records count]; i++) {
        [resultArray addObject:[self convertNdefRecord: records[i]]];
    }
    return resultArray;
}

+ (NSString *)getErrorMessage:(NSError *)error {
     NSDictionary *userInfo = [error userInfo];
     NSError *underlyingError = [userInfo objectForKey:NSUnderlyingErrorKey];
    if (underlyingError != nil) {
        return [NSString stringWithFormat:@"%@:%ld,%@:%ld",
                [error domain], (long)[error code],
                [underlyingError domain], (long)[underlyingError code]];
    }
    return [NSString stringWithFormat:@"%@:%ld",
            [error domain], (long)[error code]];
}


+ (NSString *)getHexString:(NSData *)data {
    NSUInteger capacity = data.length * 2;
    NSMutableString *sbuf = [NSMutableString stringWithCapacity:capacity];
    const unsigned char *buf = data.bytes;
    NSInteger i;
    for (i=0; i<data.length; ++i) {
        [sbuf appendFormat:@"%02lX", (unsigned long)buf[i]];
    }
    return sbuf;
}

-(void)setAlertMessage:(NSString *)alertMessage
{
    if (@available(iOS 11.0, *)) {
        if (self.session != nil) {
            self.session.alertMessage = alertMessage;
            
        } else if (self.sessionEx != nil) {
            self.sessionEx.alertMessage = alertMessage;
            
        } else {
            NSLog(@"Not even registered");
        }
    } else {
        NSLog(@"Not support in this device");
    }
}

#pragma nfc delegate

- (void)readerSession:(NFCNDEFReaderSession *)session didDetectNDEFs:(NSArray<NFCNDEFMessage *> *)messages
{
    NSLog(@"readerSession:didDetectNDEFs");
    if ([messages count] > 0) {
        // parse the first message for now
        [[NSNotificationCenter defaultCenter]
         postNotificationName:NfcManagerDiscoverTag
         object:nil
         userInfo:@{@"ndefMessage": [self convertNdefMessage:messages[0]]}];
    } else {
        [[NSNotificationCenter defaultCenter] postNotificationName:NfcManagerDiscoverTag object:nil userInfo:@{@"ndefMessage": @[]}];
    }
}

- (void)readerSession:(NFCNDEFReaderSession *)session didInvalidateWithError:(NSError *)error
{
    NSLog(@"readerSession:didInvalidateWithError: (%@)", [error localizedDescription]);
    if (self.techRequestCallback) {
        NSLog(@"%@", [NFCCore getErrorMessage:error]);
        self.techRequestCallback(false);
        self.techRequestCallback = nil;
    }
    
    [self reset];
    [[NSNotificationCenter defaultCenter] postNotificationName:NfcManagerSessionClosed object:nil userInfo:@{}];
}

- (void)tagReaderSession:(NFCTagReaderSession *)session didDetectTags:(NSArray<__kindof id<NFCTag>> *)tags
{
    NSLog(@"NFCTag didDetectTags");
    if (@available(iOS 13.0, *)) {
        if (self.techRequestCallback != nil) {
            BOOL found = false;

            __weak typeof(self) weakSelf = self;
            for (NSNumber* requestType in self.techRequestTypes) {
                for (id<NFCTag> tag in tags) {
                    // here we treat Ndef is a special case, because all specific tech types
                    // inherites from NFCNDEFTag, so we simply allow it to connect                    
                    if (tag.type == [requestType integerValue]) {
                        [self.sessionEx connectToTag:tag
                              completionHandler:^(NSError *error) {
                            __strong typeof(self) strongSelf = weakSelf;                    
                            if (error != nil) {
                                NSLog(@"%@", [NFCCore getErrorMessage:error]);
                                strongSelf.techRequestCallback(false);
                                strongSelf.techRequestCallback = nil;
                                return;
                            }
                            
                            strongSelf.techRequestCallback(true);
                            strongSelf.techRequestCallback = nil;
                        }];
                        found = true;
                        break;
                    }
                }
            }
            
            if (!found) {
                NSLog(@"No tech matches");
                self.techRequestCallback(false);
                self.techRequestCallback = nil;
            }
            
        }
    }
}

- (void)tagReaderSession:(NFCTagReaderSession *)session didInvalidateWithError:(NSError *)error
{
    NSLog(@"NFCTag didInvalidateWithError");
    if (self.techRequestCallback) {
        NSLog(@"%@", [NFCCore getErrorMessage:error]);
        self.techRequestCallback(false);
        self.techRequestCallback = nil;
    }
    
    [self reset];
    [[NSNotificationCenter defaultCenter] postNotificationName:NfcManagerSessionClosed object:nil userInfo:@{}];
}

- (void)tagReaderSessionDidBecomeActive:(NFCTagReaderSession *)session
{
    NSLog(@"NFCTag didBecomeActive");
}

@end
