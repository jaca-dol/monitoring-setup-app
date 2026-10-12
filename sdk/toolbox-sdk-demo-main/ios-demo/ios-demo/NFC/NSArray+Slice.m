//
//  NSArray+Slice.m
//  device-codec-oc-release_Example
//
//  Created by 郑宗刚 on 2024/8/23.
//  Copyright © 2024 郑宗刚. All rights reserved.
//

#import "NSArray+Slice.h"

@implementation NSArray (Slice)

- (NSArray *)sliceFromIndex:(NSInteger)start toIndex:(NSInteger)end {
    // Ensure start and end are within bounds
    if (start < 0) {
        start = 0;
    }
    if (end > [self count]) {
        end = [self count];
    }
    if (start > end) {
        return @[]; // Return an empty array if start is greater than end
    }
    
    NSRange range = NSMakeRange(start, end - start);
    return [self subarrayWithRange:range];
}

- (NSArray *)safeSubarrayFromRange:(NSRange)range {
    if (range.location >= self.count) {
        return @[];   // empty
    }

    NSUInteger maxLength = self.count - range.location;
    NSUInteger safeLength = MIN(range.length, maxLength);

    return [self subarrayWithRange:NSMakeRange(range.location, safeLength)];
}


@end
