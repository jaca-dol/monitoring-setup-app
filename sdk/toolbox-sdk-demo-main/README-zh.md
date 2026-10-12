[English](./README.md) | [中文](./README-zh.md)
# 原生Demo

相关介绍介绍请移步到ios-demo跟android-demo

# RN Demo

支持所有IPSOv1跟IPSOv2的读写

### 运行demo

```shell
yarn install

#iOS
yarn pod && yarn ios

#Android
yarn android
```

![demo](image/README/demo.gif "demo")
![demo_ble](image/README/demo_ble.gif "demo_ble")

# SDK安装

> 你可能需要蓝牙跟nfc相关的原生配置，请参考
> nfc: https://github.com/revtel/react-native-nfc-manager
> ble: https://innoveit.github.io/react-native-ble-manager/install/

```shell
#第三方native依赖
yarn add react-native-ble-manager@11.5.1
yarn add react-native-nfc-manager@2.1.8
yarn add react-native-device-info@14.0.4
yarn add react-native-mmkv@2.11.0
yarn add react-native-permissions@3.10.1 #原生权限相关，主要用于安卓蓝牙
yarn add react-native-android-location-enabler@^2.0.1 #安卓定位权限，用于蓝牙
yarn add react-native-localize@1.4.3

#sdk安装
yarn add toolbox-sdk@file:path/to/toolbox-sdk-0.x.xx.tgz

#需要应用相关patch修改第三方库，也可以将该命令加在package.json的postinstall当中，自动在安装依赖后执行
npx toobox-patch init

#package.json
...
"postinstall": "npx toolbox-patch init"

```

# 快速开始

## NFC

```typescript
import { useCommService, NFC } from 'toolbox-sdk';
const { read, write } = useCommService();
//读取
const deviceInfo = await read('nfc');
//deviceEui
const deviceEui = deviceInfo.deviceEui;
//写入
await write(deviceInfo, 'nfc');


//开机（需要先读取设备信息
await NFC.powerOn();

//关机（需要先读取设备信息
await NFC.powerOff();

//重启
await NFC.reset();

//NFC监听事件，详情见NfcModal.tsx
...
useEffect(() => {
	const beforeStartListener = NFC.addEventListener(NfcTrackerEvents.beforeStart, onBeforeStart);
	const startListener = NFC.addEventListener(NfcTrackerEvents.start, onStart);
	const progressListener = NFC.addEventListener(NfcTrackerEvents.progress, onProgressChange);
	const errorListener = NFC.addEventListener(NfcTrackerEvents.error, onError);
	const successListener = NFC.addEventListener(NfcTrackerEvents.success, onSuccess);
	return () => {
		beforeStartListener.remove();
		startListener.remove();
		progressListener.remove();
		errorListener.remove();
		successListener.remove();
	};
}, []);

//NFC开始读取前
const onBeforeStart = () => {
	setNfcModalTitle('NFC Modal');
	setNfcModalMessage('Please scan the NFC tag');
	setNfcModalVisible(true);
};

//NFC开始读取
const onStart = (commandName: NfcCommandName) => {
	setNfcModalTitle(NfcUtils.getTitle(commandName));
	setNfcModalMessage('starting...');
	setNfcModalVisible(true);
};

//NFC读取进度
const onProgressChange = (progress: number) => {
	setNfcModalMessage(`${Math.round(progress * 100)}%`);
};
//NFC读取错误
const onError = (error: any, errorMessage: string) => {
	setNfcModalMessage(errorMessage);
	NFC.setErrorAlertMessage(errorMessage);
	setTimeout(() => {
		setNfcModalVisible(false);
	}, 500);
};
//NFC读取成功
const onSuccess = (commandName: NfcCommandName, _message?: string) => {
	setNfcModalMessage(_message ?? 'success');
	setTimeout(() => {
		setNfcModalVisible(false);
	}, 500);
};
```

## 蓝牙

- 蓝牙相比于nfc需要多增蓝牙连接与认证才能进行相关的读取写入操作。
- 基本所有蓝牙命令都需要加上密码段进行验证
- 密码由DevicePasswordManager全局管理，认证成功后，后续的密码将直接从DevicePasswordManager直接取出。

```typescript

import { useCommService } from 'toolbox-sdk';
const { read, write } = useCommService();
//已连接情况下读取
const deviceInfo = await read('ble');
//已连接情况下写入
await write(deviceInfo, 'ble');

//可以通过获取当前连接外围设备判断蓝牙是否连接到某个设备，为空表示无连接
const currentPeripheral = BleManager.getCurrentConnectedPeripheral()
//未连接情况下先开启蓝牙搜索
BleManager.scan();
//监听蓝牙事件
useEffect(() => {
    //开始搜寻外围设备
	const scanListener = BleManager.on(BleEvent.scan, onScan);
    //发现外围设备事件
	const discoverListener = BleManager.on(BleEvent.discover, onDiscoverPeripheral);
    //停止搜索事件
	const stopScanListener = BleManager.on(BleEvent.stopScan, onStopScan);
    //断连事件
	const disconnectListener = BleManager.on(BleEvent.disconnect, onDisconnect);
	return () => {
		discoverListener.off();
		stopScanListener.off();
		disconnectListener.off();
	};
}, []);

//sdk会过滤掉非milesight的设备
const onDiscoverPeripheral = () => {
    //发现外围设备，该回调会不断调用只要有新的设备被发现
    const peripherals = BleManager.getAllPeripherals();
    setPeripherals(peripherals);
};

//渲染外围设备
const renderItem = ({ item }: { item: Peripheral }) => {
    const isConnected = item.connected || item.id === BleManager.getCurrentConnectedPeripheral()?.id;
    const isConnecting = connecting && cidRef.current === item.id;
    const hasConnectedCount = item.connectCount > 0;
    let statusText = '';
    if (isConnecting) {
        statusText = 'connecting...';
    } else if (isConnected) {
        statusText = 'Connected';
    } else if (hasConnectedCount) {
        statusText = 'been connected';
    } else {
        statusText = 'not connected';
    }
    return (
        <Pressable style={styles.item} onPress={() => startConnect(item.id)}>
            <Text>{item.name}</Text>
            <View style={styles.rightView}>
                <Text>{statusText}</Text>
            </View>
        </Pressable>
    );
};

//外围设备的认证与连接
const startConnect = async (id: string) => {
    try {
        //蓝牙连接需要密码认证，后续的蓝牙通信都是通过从DevicePasswordManager中取出认证成功的密码进行通信
        const {password = ''} = DevicePasswordManager.getPasswordById(id, false);
        if (!password) {
            //无绑定密码，需要弹出密码框，详见PasswordContent.tsx相关逻辑
            setPasswordContentVisible(true);
            return;
        }
        //已绑定情况下可以直接连接
        await connectWithPassword(id, password);
    } catch (error) {
        setErrorMessage(getErrorMessage(error));
    } finally {
        setConnecting(false);
    }
};

//useCommService取出蓝牙连接与认证动作
const { bleConnect, bleAuth } = useCommService();
const connectWithPassword = async (id: string, password: string) => {
    try {
        await bleConnect(id);
        await bleAuth(id, password);
        await sleep(10);
        //认证成功后，可以从BleManager拿到当前的连接的外围设备
        onConnectSuccess(BleManager.getCurrentConnectedPeripheral());
    } catch (error) {
        setErrorMessage(getErrorMessage(error));
    } finally {
        setConnecting(false);
    }
};






```
