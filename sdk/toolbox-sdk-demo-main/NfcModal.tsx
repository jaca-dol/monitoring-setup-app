import React, { useState, useEffect } from 'react';
import { Modal, Text, View, StyleSheet, Platform } from 'react-native';
import { NFC } from 'toolbox-sdk/service/nfc/controller';
import { NfcTrackerEvents, NfcCommandName, NfcUtils } from 'toolbox-sdk/service/nfc';

const NfcModal: React.FC = () => {

	const [visible, setVisible] = useState(false);
	const [title, setTitle] = useState('NFC Modal');
	const [message, setMessage] = useState('Please scan the NFC tag');

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
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const setNfcModalTitle = (_title: string) => {
		if (Platform.OS === 'ios') {
			// setTitle(_title);
		} else {
			setTitle(_title);
		}
	};
	const setNfcModalMessage = (_message: string) => {
		if (Platform.OS === 'ios') {
			NFC.setAlertMessage(_message);
		} else {
			setMessage(_message);
		}
	};
	const setNfcModalVisible = (_visible: boolean) => {
		if (Platform.OS === 'ios') {
		} else {
			setVisible(_visible);
		}
	};

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

	return (
		<Modal visible={visible && Platform.OS === 'android'} transparent={true} animationType="slide">
			<View style={styles.container}>
				<View style={styles.content}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.message}>{message}</Text>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	content: {
		width: '100%',
		padding: 20,
		height: 200,
		alignItems: 'center',
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
});

export default NfcModal;
