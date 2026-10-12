//
//  DeviceUtil.h
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/18.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface DeviceUtil : NSObject

+ (NSDictionary *)getFlashInfo:(NSArray *)data;

+ (NSDictionary *)setFlashInfo:(NSArray *)data withJSON:(NSString *)jsonStr;

+ (NSString *)dictionaryToJsonString:(NSDictionary *)dict;

+ (NSDictionary *)dictionaryFromJsonString:(NSString *)jsonString;

@end

NS_ASSUME_NONNULL_END
