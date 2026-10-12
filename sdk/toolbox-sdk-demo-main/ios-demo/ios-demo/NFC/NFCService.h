//
//  NFCService.h
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/17.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

extern NSString* const APP_NFC_MAGIC;
extern NSString* const APP_NFC_VERSION;
extern NSString* const APP_NFC_STATUS_CHECK_COMMAND;
extern NSString* const APP_NFC_READ_DEVICE_DATA_COMMAND;
extern NSString* const NFC_SEND_DEVICE_COMMAND;
extern NSString* APP_NFC_COMMAND_PREFIX(void);
extern NSString* const APP_NFC_WRITE_CARD_DATA_COMMAND;
extern NSString* const APP_NFC_READ_CARD_DATA_COMMAND;
extern NSString* const APP_NFC_READ_PKT;
extern NSString* const APP_NFC_WRITE_PKT;

@interface NFCService : NSObject

- (void)startDetectionWithCallback:(void(^)(Boolean success))callback;

- (void)createCheckFunc:(NSArray *)bytes checkCondition:(Boolean(^)(NSArray *response))condition callback:(void(^)(NSArray *response, NSString* _Nullable errorMessage))callback;

- (void)sendCommand:(NSString *)command callback:(void(^)(Boolean success, NSUInteger length))callback;

- (void)readFlashWithCallback:(void(^)(Boolean success, NSDictionary *flashInfo, NSArray *flashData))callback;

- (void)writeFlash:(NSDictionary *)settingJSON newDeviceSettingInfo:(NSDictionary *)newDeviceSettingInfo rawData:(NSArray *)rawData callback:(void(^)(Boolean success))callback;

@end

NS_ASSUME_NONNULL_END
