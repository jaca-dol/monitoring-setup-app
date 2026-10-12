import React, { useState } from 'react';
import { Text, View, StyleSheet, Button, TextInput } from 'react-native';

interface PasswordContentProps {
    onClose: () => void;
    onSave: (password: string) => void;
}

const PasswordContent: React.FC<PasswordContentProps> = ({ onClose, onSave }) => {

    const [password, setPassword] = useState<string>('');

	return (
		<View style={styles.container} >
			<View style={styles.content}>
                <View style={styles.head}>
                    <Text style={styles.title}>{'Password'}</Text>
                    <Button title="close" onPress={() => onClose()} />
                </View>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="请输入密码" placeholderTextColor="gray" />
                <Button title="save" onPress={() => onSave(password)} />
			</View>
		</View>
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
        color: 'black',
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
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
    input: {
        height: 40,
        borderWidth: 1,
        borderColor: 'gray',
        marginBottom: 20,
        color: 'black',
    },
});

export default PasswordContent;
