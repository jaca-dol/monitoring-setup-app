//
//  NFCManager.h
//  device-codec-oc-release_Example
//
//  Created by 郑宗刚 on 2024/8/21.
//  Copyright © 2024 郑宗刚. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreNFC/CoreNFC.h>

NS_ASSUME_NONNULL_BEGIN

typedef NSString * NFCCommand NS_STRING_ENUM;
typedef void (^CompleteHandler)(BOOL, NSError * _Nullable error);

@interface NFCManager : NSObject

@property (nonatomic, strong) NFCTagReaderSession *tagSession;

+ (instancetype)manager;

+ (NFCCommand)cmdReadFlash;
+ (NFCCommand)cmdReadDeviceData;

- (void)read;
- (void)detectAndConnectTag:(CompleteHandler)complete;

//- (void)sendCommand:(NFCCommand)command
//            needPad:(BOOL)needPad
//  completionHandler:(void(^)(NSArray* response, NSError* error))completionHandler;
//
//- (void)sendCommand:(NFCCommand)command
//  completionHandler:(void(^)(NSArray* response, NSError* error))completionHandler;

@end

NS_ASSUME_NONNULL_END
