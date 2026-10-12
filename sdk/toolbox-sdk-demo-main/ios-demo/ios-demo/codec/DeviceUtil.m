//
//  DeviceUtil.m
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/18.
//

#import "DeviceUtil.h"
#import "nfc_app.h"

@implementation DeviceUtil

+ (NSDictionary *)getFlashInfo:(NSArray *)data {
  int count = [data count];
  printf("getFlashInfo count %d\n", count);
  char charArray[count];
  int cArray[count];
   
  for (int i = 0; i < count; ++i) {
    cArray[i] = [[data objectAtIndex:i] intValue];
    charArray[i] = (char)cArray[i] & 0xFF;
  }
//  char *charArray = [self getCharArr:data withCount:count];
//  RCTLog(@"data %@", data);
//  RCTLog(@"data %@", data);
  char *cjsonStr = get_flash_base_info(charArray, count);
  printf("cjsonStr %s", cjsonStr);
  NSString *jsonStr = [NSString stringWithUTF8String:cjsonStr];
//  RCTLog(@"jsonStr %@", jsonStr);
  if (data) {
      return [self dictionaryFromJsonString:jsonStr];
  } else {
    NSError *error = [NSError errorWithDomain:NSURLErrorDomain code:666 userInfo:@{NSLocalizedDescriptionKey:@"get_flash_base_info error"}];;
    NSLog(@"get flash base info %@", error);
      return @{};
  }
}

+ (NSDictionary *)setFlashInfo:(NSArray *)data withJSON:(NSString *)jsonStr
{
  int count = [data count];
  printf("setFlashInfo count %d\n", count);
  char charArray[count];
  int cArray[count];
  const char * cJsonStr =[jsonStr UTF8String];
   
  for (int i = 0; i < count; ++i) {
    cArray[i] = [[data objectAtIndex:i] intValue];
    charArray[i] = (char)cArray[i] & 0xFF;
  }
//  char *charArray = [self getCharArr:data withCount:count];
//  RCTLog(@"data %@", data);
//  RCTLog(@"data %@", data);
  char *cResultjsonStr = set_flash_base_info(charArray, cJsonStr);
  NSString *resultJsonStr = [NSString stringWithUTF8String:cResultjsonStr];
  NSError *error = nil;
  id jsonObject = [NSJSONSerialization
                       JSONObjectWithData:[resultJsonStr dataUsingEncoding:NSUTF8StringEncoding] options:NSJSONReadingAllowFragments error:&error];
  NSDictionary *deserializedDict = (NSDictionary *)jsonObject;
  NSLog(@"setFlashInfo Deserialized JSON Dictionary = %@", deserializedDict);
  NSString *successCode = @"1";
  if([deserializedDict objectForKey:@"code"]) {
    NSMutableArray * rawData = [[NSMutableArray alloc] initWithCapacity: count];
    for (int j = 0; j < count; j++) {
      NSNumber * intWrapped = [NSNumber numberWithInt: (int)charArray[j]];
      [rawData addObject: intWrapped];
    }
    
    NSDictionary *finalDictionary = [[NSDictionary alloc] initWithObjectsAndKeys:
    [deserializedDict objectForKey:@"code"], @"code", rawData, @"rawData", resultJsonStr,@"result",nil];
    
    return finalDictionary;
  } else {
    NSError *error = [NSError errorWithDomain:NSURLErrorDomain code:666 userInfo:@{NSLocalizedDescriptionKey:@"set_flash_base_info error"}];;
    NSLog(@"set flash base info %@", error);
    return @{};
  }
}
    
+ (NSDictionary *)dictionaryFromJsonString:(NSString *)jsonString {
    if (jsonString == nil) return nil;

    NSData *data = [jsonString dataUsingEncoding:NSUTF8StringEncoding];

    if (!data) return nil;

    NSError *error = nil;
    id obj = [NSJSONSerialization JSONObjectWithData:data
                                             options:0
                                               error:&error];

    if (error) {
        NSLog(@"JSON parse error: %@", error);
        return nil;
    }

    if ([obj isKindOfClass:[NSDictionary class]]) {
        return (NSDictionary *)obj;
    }

    // For array JSON, return nil or handle separately
    return nil;
}

+ (NSString *)dictionaryToJsonString:(NSDictionary *)dict {
    if (!dict) return nil;
    
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:dict
                                                       options:0   // or NSJSONWritingPrettyPrinted
                                                         error:&error];
    
    if (!jsonData) {
        NSLog(@"JSON serialization error: %@", error.localizedDescription);
        return nil;
    }
    
    return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
}



@end
