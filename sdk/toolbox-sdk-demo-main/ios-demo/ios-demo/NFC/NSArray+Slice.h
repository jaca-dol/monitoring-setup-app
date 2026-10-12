//
//  NSArray+Slice.h
//  device-codec-oc-release_Example
//
//  Created by 郑宗刚 on 2024/8/23.
//  Copyright © 2024 郑宗刚. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface NSArray (Slice)

- (NSArray *)sliceFromIndex:(NSInteger)start toIndex:(NSInteger)end;

- (NSArray *)safeSubarrayFromRange:(NSRange)range;

@end

NS_ASSUME_NONNULL_END
