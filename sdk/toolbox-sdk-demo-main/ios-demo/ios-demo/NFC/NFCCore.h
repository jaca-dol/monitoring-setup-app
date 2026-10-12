//
//  NFCCore.h
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/17.
//

#import <Foundation/Foundation.h>
#import <CoreNFC/CoreNFC.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^TechReuestCallBackType)(Boolean);

extern NSNotificationName const NfcManagerDiscoverTag;
extern NSNotificationName const NfcManagerSessionClosed;


@interface NFCCore : NSObject<NFCNDEFReaderSessionDelegate, NFCTagReaderSessionDelegate>

@property (strong, nonatomic, nullable) NFCNDEFReaderSession *session;
@property (strong, nonatomic, nullable) NFCTagReaderSession *sessionEx;

+ (instancetype)sharedInstance;
- (void)requestTechnology:(NSArray<NSNumber *> *)techs callback:(TechReuestCallBackType)callback;
- (void)cancelTechnologyRequest;
- (id<NFCNDEFTag>)getTag;
- (void)sendMifareCommand:(NSArray *)bytes callback:(void(^)(Boolean success, NSArray *response, NSString* _Nullable errorMessage))callback;
- (void)setAlertMessage:(NSString *)alertMessage;
@end

NS_ASSUME_NONNULL_END
