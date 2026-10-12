/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
	Button,
	SafeAreaView,
	Text,
	View,
	StyleSheet,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { DeviceUtils, BLE_ERRORS, BleManager, BleEvent, Peripheral, useCommService, NFC } from 'toolbox-sdk';
import { DeviceInfo } from 'toolbox-sdk/model';
import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import NfcModal from './NfcModal';
import EditJsonView from './EditJsonView';
import BleModal from './BleModal';
import _ from 'lodash';

function App(): React.JSX.Element {
	const backgroundStyle = {
		backgroundColor: Colors.lighter,
		flex: 1,
	};

	const { read, write } = useCommService();
	const [loading, setLoading] = useState(false);
	const [version, setVersion] = useState<string | null>(null);
	const [currentPeripheral, setCurrentPeripheral] = useState<Peripheral | undefined>(undefined);
	const [deviceInfo, setDeviceInfo] = useState<Partial<DeviceInfo> | undefined>(undefined);
	useEffect(() => {
		DeviceUtils.mainVersion().then((v: string) => {
			setVersion(v);
		});
		const disconnectListener = BleManager.on(BleEvent.disconnect, onBleDisconnect);
		return () => {
			disconnectListener.off();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);


	const onBleDisconnect = () => {
		showAlert('Bluetooth Event', 'Bluetooth disconnected');
		setDeviceInfo(undefined);
		setCurrentPeripheral(undefined);
	};


	const bleRead = async (_currentPeripheral: Peripheral | undefined) => {
		try {

			if (_currentPeripheral) {
				setLoading(true);
				const _deviceInfo = await read('ble');
				setLoading(false);
				if (_deviceInfo) {
					console.log(JSON.stringify(_deviceInfo, null, 2));
					setDeviceInfo(_deviceInfo);
				}
			} else {
				BleManager.scan();
			}
		} catch (error) {
			if (_.has(error, 'name')) {
				if (error.name === BLE_ERRORS.BLE_NOT_ENABLED.name) {
					showAlert('Bluetooth Permission', 'Please enable Bluetooth permission in system settings');
				} else if (error.name === BLE_ERRORS.NOT_CONNECTED_PERIPHERAL.name) {
					BleManager.scan();
				}
			} else {
				console.log('qdfish ', error);
				showAlert('Unknown Error', 'Unknown Error');
			}

		} finally {
			setLoading(false);
		}
	};

	const showAlert = (title: string, message: string) => {
		Alert.alert(title, message, [
			{text: 'OK'},
		]);
	};

  return (
	<SafeAreaView style={backgroundStyle}>
		<Text style={styles.text}>version: {version}</Text>
		<View style={styles.buttonContainer}>
			<Button title="NFC Read" onPress={async () => {
				try {
					const _deviceInfo = await read('nfc');
					if (_deviceInfo) {
						console.log(JSON.stringify(_deviceInfo, null, 2));
						setDeviceInfo(_deviceInfo);
					}
				} catch (error) {
					console.log(error);
				}
			}}/>
			<Button title="NFC Write" onPress={async () => {
				try {
					await write(deviceInfo ?? {}, 'nfc');
				} catch (error) {
					console.log(error);
				}
			}}/>
		</View>
        <View style={styles.buttonContainer}>
			<Button title="NFC Power On" disabled={deviceInfo === undefined} onPress={async () => {
				try {
					await NFC.powerOn();
				} catch (error) {
					console.log(error);
				}
			}}/>
			<Button title="NFC Power Off" disabled={deviceInfo === undefined} onPress={async () => {
				try {
					await NFC.powerOff();
				} catch (error) {
					console.log(error);
				}
			}}/>
            <Button title="NFC Reset" disabled={deviceInfo === undefined} onPress={async () => {
				try {
					await NFC.reset();
				} catch (error) {
					console.log(error);
				}
			}}/>
		</View>
		<View style={styles.buttonContainer}>
			<Button title="BLE Read" onPress={() => bleRead(currentPeripheral)}/>
			<Button title="BLE Write" onPress={async () => {
				try {
					setLoading(true);
					await write(deviceInfo ?? {}, 'ble');
					setLoading(false);
					showAlert('Bluetooth Event', 'Bluetooth write success');
				} catch (error) {
					console.log(error);
				}
			}}/>
		</View>
		<Text style={styles.text}>{`currentPeripheral: ${currentPeripheral?.name}`}</Text>
		<Button disabled={!currentPeripheral} title="disconnect" onPress={async () => {
			await BleManager.disconnect(currentPeripheral?.id ?? '');
			setCurrentPeripheral(undefined);
		}}/>
		<EditJsonView data={deviceInfo ?? {}} onDataChange={(data) => {
			setDeviceInfo(data);
		}} />
		<NfcModal />
		<BleModal onConnectSuccess={() => {
			setCurrentPeripheral(BleManager.getCurrentConnectedPeripheral());
			bleRead(BleManager.getCurrentConnectedPeripheral());
		}} />
		{loading && <ActivityIndicator animating={true} size={'large'} style={styles.loading} />}
	</SafeAreaView>
  );
}


const styles = StyleSheet.create({
	buttonContainer: {
		marginTop: 10,
		flexDirection: 'row',
		justifyContent: 'space-evenly',
	},
	loading: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	text: {
		color: 'black',
	},
});



export default App;
