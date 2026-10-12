//
//  ViewController.m
//  ios-demo
//
//  Created by 郑宗刚 on 2025/12/17.
//

#import "ViewController.h"
#import "NFC/NFCManager.h"
#import "NFC/NFCService.h"

@interface ViewController ()

@property (nonatomic, strong) NFCService *service;
@property (nonatomic, strong) NSArray *rawData;
@property (nonatomic, strong) NSMutableDictionary *flashInfo;
@property (nonatomic, strong) UILabel *buttonlightLabel;
@property (nonatomic, strong) UITextField *inputText;

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    
    self.service = [[NFCService alloc] init];
    
    UIButton *readButton = [[UIButton alloc] initWithFrame:CGRectMake(30, 100, 100, 40)];
    readButton.titleLabel.text = @"read";
    [readButton setTitle:@"read" forState:UIControlStateNormal];
    readButton.backgroundColor = [UIColor blackColor];
    [readButton addTarget:self action:@selector(readAction) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:readButton];
    
    self.buttonlightLabel = [[UILabel alloc] initWithFrame:CGRectMake(130, 100, 0, 0)];
    self.buttonlightLabel.text = @"buttonLight:unknown";
    [self.buttonlightLabel sizeToFit];
    CGRect frame = self.buttonlightLabel.frame;
    frame.size.height = 40;
    self.buttonlightLabel.frame = frame;
    [self.view addSubview:self.buttonlightLabel];
    

    UIButton *writeButton = [[UIButton alloc] initWithFrame:CGRectMake(30, 150, 100, 40)];
    writeButton.titleLabel.text = @"write";
    [writeButton setTitle:@"write" forState:UIControlStateNormal];
    writeButton.backgroundColor = [UIColor blackColor];
    [writeButton addTarget:self action:@selector(writeAction) forControlEvents:UIControlEventTouchUpInside];
    [self.view addSubview:writeButton];
    
    self.inputText = [[UITextField alloc] initWithFrame:CGRectMake(130, 150, 200, 40)];
    self.inputText.borderStyle = UITextBorderStyleRoundedRect;
    self.inputText.placeholder = @"enter button light value";
    [self.view addSubview:self.inputText];

}

- (void)readAction {
    [self.service readFlashWithCallback:^(Boolean success, NSDictionary *flashInfo, NSArray *flashData) {
        if (success) {
            NSLog(@"read flash success");
            self.rawData = flashData;
            self.flashInfo = [flashInfo mutableCopy];
            self.buttonlightLabel.text = [NSString stringWithFormat:@"buttonLight:%@", [self.flashInfo objectForKey:@"buttonLight"]];
        } else {
            NSLog(@"read flash failed");
        }
    }];
}

- (void)writeAction {

    if (self.inputText.text.length == 0) {
        NSLog(@"please enter button light value");
        return;
    }
    NSInteger buttonLight = [self.inputText.text integerValue];
    NSDictionary *newDeviceSettingInfo = @{@"buttonLight": @(buttonLight)};
    [self.service writeFlash:newDeviceSettingInfo newDeviceSettingInfo:newDeviceSettingInfo rawData:self.rawData callback:^(Boolean success) {
        if (success) {
            NSLog(@"write flash success");
        } else {
            NSLog(@"write flash failed");
        }
    }];
}

@end
