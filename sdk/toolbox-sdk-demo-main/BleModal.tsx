import React, { useState, useEffect, useRef } from 'react';
import { Modal, Text, View, StyleSheet, FlatList, Button, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { BleManager, BleEvent } from 'toolbox-sdk';
import { Peripheral } from 'toolbox-sdk';
import { DevicePasswordManager } from 'toolbox-sdk/service/password';
import { sleep } from 'toolbox-sdk/utils';
import PasswordContent from './PasswordContent';
import { useCommService } from 'toolbox-sdk';
import { isObject } from 'lodash';

interface BleModalProps {
	onConnectSuccess: (peripheral: Peripheral | undefined) => void;
}

const BleModal: React.FC<BleModalProps> = ({ onConnectSuccess }) => {

	const { bleConnect, bleAuth } = useCommService();
	const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
	const [visible, setVisible] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const cidRef = useRef<string>('');
	const [ connecting, setConnecting ] = useState(false);
	const [ passwordContentVisible, setPasswordContentVisible ] = useState<boolean>(false);

	useEffect(() => {
		const scanListener = BleManager.on(BleEvent.scan, onScan);
		const discoverListener = BleManager.on(BleEvent.discover, onDiscoverPeripheral);
		const stopScanListener = BleManager.on(BleEvent.stopScan, onStopScan);
		const disconnectListener = BleManager.on(BleEvent.disconnect, onDisconnect);

		return () => {
			scanListener.off();
			discoverListener.off();
			stopScanListener.off();
			disconnectListener.off();
		};

	}, []);

	useEffect(() => {
		try {
			if (!visible) {
				BleManager.stopScan();
			}
		} catch (error) {
			console.error(error);
		}

	}, [visible]);

	const onDiscoverPeripheral = () => {
		setErrorMessage('');
		const _peripherals = BleManager.getAllPeripherals();
		setPeripherals(_peripherals);		
	};


	const onScan = () => {
		setErrorMessage('scanning...');
		setVisible(true);
	};

	const onStopScan = () => {
		setVisible(false);
		setPeripherals([]);
	};

	const onDisconnect = () => {

	};

	const startConnect = async (id: string) => {

		try {
			setConnecting(true);
			setErrorMessage('');
			cidRef.current = id;
			const {password = ''} = DevicePasswordManager.getPasswordById(id, false);
			console.log('startConnect password', password);
			if (!password) {
				setPasswordContentVisible(true);
				return;
			}
			await connectWithPassword(id, password);
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setConnecting(false);
		}
	};

	const connectWithPassword = async (id: string, password: string) => {
		try {
			setPasswordContentVisible(false);
			setErrorMessage('');
			await bleConnect(id);
			await bleAuth(id, password);
			setVisible(false);
			await sleep(10);
			onConnectSuccess(BleManager.getCurrentConnectedPeripheral());
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setConnecting(false);
		}
	};

	const getErrorMessage = (error: any): string => {
		try {
			if(typeof error === 'string') {
				return error;
			}

			if (typeof error?.message === 'string') {
				return error?.message;
			}

			if (error?.message != null) {
				if(isObject(error.message)) {
					return error.message?.message ?? JSON.stringify(error.message);
				}

				return JSON.stringify(error.message);
			}

			if (error != null) {
				return error.toString();
			}

			return error;
		} catch (e) {
			return error;
		}
	};

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
				<Text style={styles.itemText}>{item.name}</Text>
				<View style={styles.rightView}>
					<Text style={styles.itemText}>{statusText}</Text>
				</View>
			</Pressable>
		);
	};

	const renderContent = () => {
		return (
			<>
				<View style={styles.head}>
						<Text style={styles.title}>{'BLE Devices'}</Text>
						<Button title="close" onPress={() => onStopScan()} />
				</View>
				<FlatList
					data={peripherals}
					renderItem={renderItem}
				/>
			</>
		);
	};

	return (
		<>
		<Modal visible={visible} transparent={true} animationType="slide">
			<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<View style={styles.content}
				>
					<Text style={styles.errorMessage}>{errorMessage}</Text>
					{passwordContentVisible ? <PasswordContent onClose={() => setPasswordContentVisible(false)} onSave={(password: string) => connectWithPassword(cidRef.current, password)}/> : renderContent()}
				</View>
			</KeyboardAvoidingView>
		</Modal>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	head: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 10,
		borderBottomWidth: 1,
		borderBottomColor: 'gray',
	},
	content: {
		width: '100%',
		padding: 20,
		height: '70%',
		backgroundColor: 'white',
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
		color: 'black',
	},
	message: {
		fontSize: 16,
		marginBottom: 20,
		color: 'black',
	},
	rightView: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	item: {
		height: 40,
		flexDirection: 'row',
		paddingHorizontal: 10,
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	itemText: {
		color: 'black',
	},
	errorMessage: {
		color: 'red',
		marginBottom: 10,
	},
});

export default BleModal;
