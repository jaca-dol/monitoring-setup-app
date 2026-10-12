/* eslint-disable eqeqeq */
import JSONTree, { JSONTreeProps } from 'react-native-json-tree';
import { Text, Modal, View, StyleSheet, TextInput, Button, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import _ from 'lodash';

interface EditJsonViewProps {
	data: Record<string, any>;
	onDataChange: (data: Record<string, any>, changePath: string) => void;
}

function isNumeric(value: any): boolean {
    return value !== null && value !== '' && !isNaN(Number(value));
}

const keyPathToString = (keyPaths: string[]) => {
    //reverse array
    const _keyPaths = keyPaths.reverse().map((key) => {
        if (isNumeric(key)) {
            return `[${key}]`;
        }
        return key;
    });
    return _keyPaths.join('.');
};

type ObjectType = 'Object' | 'Error' | 'Array' | 'Iterable' | 'String' | 'Number' | 'Boolean' | 'Date' | 'Null' | 'Undefined' | 'Function' | 'Symbol' | 'Custom';

const EditJsonView: React.FC<EditJsonViewProps> = ({data, onDataChange}) => {
    const [originalData, setOriginalData] = useState<Record<string, any>>(data);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [keyPath, setKeyPath] = useState<string>('');
    const [value, setValue] = useState<string>('');
    const [objectType, setObjectType] = useState<ObjectType | undefined>(undefined);
    const _labelRenderer: JSONTreeProps['labelRenderer'] = (keyPaths, _objectType) => {

        return <Text style={styles.labelText} onPress={() => {

            if (_objectType != 'Number' && _objectType != 'String' && _objectType != 'Boolean' && _objectType != 'Null' && _objectType != 'Undefined' && _objectType != 'Array') {
                Alert.alert('only pure type can be edited');
                return;
            }

            setObjectType(_objectType);
            setIsModalVisible(true);
            setKeyPath(keyPathToString(keyPaths));
            setValue(_.get(originalData, keyPath));
        }}>{keyPaths[0]}</Text>;
    };

    useEffect(() => {
        setOriginalData(data);
    }, [data]);

	return <>
    <ScrollView>
        <JSONTree data={originalData} hideRoot labelRenderer={_labelRenderer} />
        </ScrollView>
		<Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={() => setIsModalVisible(false)}>
			<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.content} >
                    <Text style={styles.title}>Edit JSON</Text>
                    <Text style={styles.message}>{`${keyPath} [${objectType}]`}</Text>
                    <Text style={styles.message}>{'if type is array, split by comma(,), boolean value is 0 or 1'}</Text>
                    <TextInput value={value} onChangeText={setValue} style={styles.input} />
                    <View style={styles.buttonContainer}>
                    <Button title="Save" onPress={() => {
                        setIsModalVisible(false);
                        setOriginalData(rawData => {
                            const _data = _.cloneDeep(rawData);
                            if (objectType == 'Number') {
                                _.set(_data, keyPath, Number(value));
                            } else if (objectType == 'String') {
                                _.set(_data, keyPath, String(value));
                            } else if (objectType == 'Boolean') {
                                _.set(_data, keyPath, Boolean(Number(value)));
                            } else if (objectType == 'Array') {
                                _.set(_data, keyPath, value.split(',').map(Number));
                            } else {
                                _.set(_data, keyPath, value);
                            }
                            setTimeout(() => {
                                onDataChange(_data, keyPath);
                            }, 100);

                            return _data;
                        });

                    }} />
                    <Button title="Cancel" onPress={() => {
                        setIsModalVisible(false);
                    }} />
                    </View>
                </View>

			</KeyboardAvoidingView>
		</Modal>
	</>;
};

export default EditJsonView;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        padding: 20,
        height: 300,
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
    input: {
        borderWidth: 1,
        borderColor: 'gray',
        padding: 10,
        marginBottom: 20,
        width: '100%',
        color: 'black',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },


    labelText: {
        fontSize: 16,
    },
    scrollView: {
        flex: 1,
        // height: '100%',
        // backgroundColor: 'red',
    },
});
