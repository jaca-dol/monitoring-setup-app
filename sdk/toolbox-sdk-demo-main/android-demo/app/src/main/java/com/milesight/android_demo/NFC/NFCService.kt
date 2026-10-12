package com.milesight.android_demo.NFC
import android.os.Handler
import android.os.Looper

import android.app.Activity
import com.milesight.android_demo.ModalManager
import com.milesight.android_demo.ToolboxSdkModule
import org.json.JSONObject

// Top-level constants
const val APP_NFC_MAGIC = "4d3c2b1a78563412"
const val APP_NFC_VERSION = "01"

const val APP_NFC_STATUS_CHECK_COMMAND = "3AEDED"
const val APP_NFC_READ_DEVICE_DATA_COMMAND = "3AF0FF"
const val APP_NFC_SEND_DEVICE_COMMAND = "A6F0FF"

const val APP_NFC_WRITE_CARD_DATA_COMMAND = "A2"
const val APP_NFC_READ_CARD_DATA_COMMAND = "3A"

const val APP_NFC_READ_PKT = "01"
const val APP_NFC_WRITE_PKT = "02"

const val APP_NFC_WRITE_FLASH = "01"
const val APP_NFC_POWER_ON = "02"
const val APP_NFC_POWER_OFF = "03"
const val APP_NFC_UPGRADE = "04"

const val NFC_COMMAND_WRITEABLE = "writeable";
const val NFC_COMMAND_READABLE = "readable";
const val NFC_COMMAND_ACK = "ack";
const val NFC_COMMAND_RECEIVE_DATA = "receiveData";
const val NFC_COMMAND_READ_STATUS = "readStatus";
const val NFC_COMMAND_READ_FLASH = "readFlash";
const val NFC_COMMAND_WRITE_FLASH = "writeFlash";

fun appNfcCommandPrefix(): String =
    "$APP_NFC_SEND_DEVICE_COMMAND$APP_NFC_MAGIC$APP_NFC_VERSION"

class NFCService(private val context: Activity) {

    val nfcCore = NFCCore(context)
    var totalProgress: Int = 100
    var currentProgress: Int = 0

    private fun showModal(content: String) {
        ModalManager.show("NFC Modal", content)
    }

    private fun setProgress(currentProgress: Int) {
        val currentPercent = kotlin.math.ceil(currentProgress.toDouble() / totalProgress * 100).toInt()
        println("current percent1 $currentPercent")
        showModal("$currentPercent")
    }

    fun startDetection(callback: (Boolean) -> Unit) {
        nfcCore.cancelTechnologyRequest()
        showModal("Please scan the NFC tag")
        nfcCore.requestTechnology("NfcA",  { result ->

            if (result) {
                val tag = nfcCore.getTag()
                tag?.let {
                    currentProgress = 0
                    setProgress(currentProgress)
                    callback(true)
                } ?: run {
                    callback(false)
                }
            } else {
                callback(false)
            }


            println("detect result: $result")

        })
    }

    fun readFlash(callback: (Boolean, Map<String, Any?>?, List<Int>?) -> Unit) {

        val _callback: (Boolean, Map<String, Any?>?, List<Int>?, String?) -> Unit = { result, flashInfo, rawData, message ->

            callback(result, flashInfo, rawData)
            nfcCore.cancelTechnologyRequest()
            message ?.let {
                showModal(message)
            }

        }

        startDetection { success ->
            if (success) {
                sendCommand(NFC_COMMAND_READ_FLASH, null, { success, length ->
                    if (success) {
                        receiveDataWithLength(length, { response ->
                            if (response != null) {
                                println("receive total data $response")
                                println("complete")

                                val sliceData = response.safeSubList(0, length)
                                val rawData = sliceData.safeSubList(128, sliceData.size - 128)
                                val flashInfo = ToolboxSdkModule().getFlashInfo(sliceData)
                                flashInfo ?.let {
                                    _callback(true, jsonToMap(flashInfo), rawData, "success");
                                }
                            } else {
                                println("receive data failed")
                                _callback(false, null, null, "receive data failed")
                            }
                        })
//                        callback(true, length)
                    } else {
                        println("send command failed")
                        _callback(false, null, null, "send command failed")
                    }
                })
            } else {
                println("start detection failed")
                _callback(false, null, null, "start detection failed")
            }
        }
    }

    fun writeFlash(
        settingJSON: Map<String, Any?>,
        newDeviceSettingInfo: Map<String, Any?>,
        rawData: List<Int>,
        callback: (Boolean) -> Unit
    ) {

        val _callback: (Boolean, String?) -> Unit = { result, message ->
            callback(result)
            message ?.let {
                showModal(message)
            }
        }

        if (rawData.isEmpty()) {
            println("raw data is empty")
            _callback(false, "raw data is empty")
            return
        }

        startDetection { detectionSuccess ->
            if (!detectionSuccess) {
                _callback(false, "detect failed")
                return@startDetection
            }

            val flashInfo = ToolboxSdkModule().setFlashInfo(rawData, JSONObject(settingJSON).toString())
            val code = (flashInfo["code"] as? Int) ?: 0

            if (code == 1) {
                val newRawData = flashInfo["rawData"] as? List<Int> ?: emptyList()
                val resultDict = jsonToMap(flashInfo["result"] as? String ?: "")
                val dataSize = (resultDict["datasize"] as? Int) ?: 0

                println("write flash result $dataSize")

                sendCommand(NFC_COMMAND_WRITE_FLASH, mapOf("datasize" to dataSize, "password" to "123456")) { cmdSuccess, length ->
                    if (!cmdSuccess) {
                        _callback(false, "cmd failed")                        
                        return@sendCommand
                    }

                    sendFlashData(newRawData, dataSize) { flashSuccess ->
                        if (!flashSuccess) {
                            println("send flash data failed")
                            nfcCore.cancelTechnologyRequest()
                            _callback(false, "send flash data failed")
                            return@sendFlashData
                        }

                        checkReadable { readableSuccess ->
                            if (!readableSuccess) {
                                println("check readable failed")
                                nfcCore.cancelTechnologyRequest()
                                _callback(false, "check readable failed") 
                                return@checkReadable
                            }

                            checkWriteSuccess { writeSuccess ->
                                if (writeSuccess) {
                                    println("check write success success")
                                    _callback(true, "write flash success")                                    
                                } else {
                                    println("check write success failed")
                                    _callback(false, "write flash failed")                                    
                                }
                                nfcCore.cancelTechnologyRequest()
                            }
                        }
                    }
                }
            } else {
                println("write flash failed $flashInfo")
                nfcCore.cancelTechnologyRequest()
                _callback(false, "write flash failed")                
            }
        }
    }


    fun sendCommand(command: String, data: Map<String, Any?>? = null, callback: (Boolean, Int) -> Unit) {
        Handler(Looper.getMainLooper()).postDelayed({            
            checkWriteable { success ->
                if (success) {
                    val commandBytes = getCommandBytes(command, data) ?: run {
                        callback(false, -1)
                        return@checkWriteable
                    }
                    println("cmdName $command send command ${listToHexString(commandBytes)}")

                    createCheckFunc(commandBytes, { response ->
                        (response?.size ?: 0) > 0
                    }, { response, errorMessage ->
                        println("command $command check result: $response")
                        if (response != null && response.isNotEmpty()) {
                            checkReadable { success ->
                                println("check readable result $success")
                                if (success) {
                                    getAckDataLength { length ->
                                        if (length >= 0) {
                                            callback(true, length)
                                        } else {
                                            println("get ack data length failed")
                                            callback(false, -1)
                                        }
                                    }
                                }        
                            }
                        } else {
                            println("send command failed")
                            callback(false, -1)
                        }
                    })
                } else {
                    println("check writeable failed")
                    callback(false, -1)
                }
            }
        }, 300) // 300 milliseconds
    }

    fun getAckDataLength(callback: (Int) -> Unit) {
        val commandBytes = getCommandBytes(NFC_COMMAND_ACK) ?: run {
            callback(-1)
            return
        }
    
        createCheckFunc(
            commandBytes,
            { response ->
                println("ack response $response")
                if ((response?.size ?: 0) >= 10 && response!![9] and 0xFF != 0) {
                    when (response[9]) {
                        3 -> println("wrong password")
                        9 -> println("stuck in bootloader")
                        8 -> println("collecting")
                        else -> println("ack error")
                    }
                    false
                } else {
                    true
                }
            },
            callback = { response, errorMessage ->
                if (response != null && response.size >= 14) {
                    val length = getDataLength(response)
                    callback(length)
                } else {
                    callback(-1)
                }
            }
        )
    }

    fun getDataLength(data: List<Int>): Int {
        // Take 4 bytes starting at index 10
        val bytes = data.subList(10, 14).map { it.toByte() }.toByteArray()
    
        // Convert little-endian byte array to UInt
        return ((bytes[0].toInt() and 0xFF) or
                ((bytes[1].toInt() and 0xFF) shl 8) or
                ((bytes[2].toInt() and 0xFF) shl 16) or
                ((bytes[3].toInt() and 0xFF) shl 24))
    }
    
    

    fun getSendCount(length: Int): Int {
        return kotlin.math.ceil(length / 64.0).toInt()
    }

    fun receiveDataWithLength(length: Int, callback: (List<Int>?) -> Unit) {
        val sendCount = getSendCount(length)
        println("receive data send count $sendCount")
        totalProgress = sendCount * 2
        receiveDataWithCount(sendCount, mutableListOf(), callback)
    }

    fun receiveDataWithCount(
        count: Int,
        result: MutableList<Int>,
        callback: (List<Int>?) -> Unit
    ) {
        if (count <= 0) {
            callback(result)
            return
        }

        checkReadable { success ->
            setProgress(++currentProgress)
            if (success) {
                val commandBytes = getCommandBytes(NFC_COMMAND_RECEIVE_DATA) ?: run {
                    callback(null)
                    return@checkReadable
                }

                nfcCore.transceive(commandBytes) { success, errorMessage, response ->
                    setProgress(++currentProgress)
                    if (success) {
                        println("receive data $response")
                        result.addAll(response!!)
                        // recursive call
                        receiveDataWithCount(count - 1, result, callback)
                    } else {
                        println("receive data failed: $errorMessage")
                        callback(null)
                    }
                }
            } else {
                callback(null)
            }
        }
    }

    
    

    fun createCheckFunc(
        dataArray: List<Int>,
        condition: (List<Int>?) -> Boolean,
        callback: (List<Int>?, String?) -> Unit
    ) {
        nfcCore.transceive(dataArray) { success, errorMessage, response ->
            if (success) {
                if (condition(response)) {
                    callback(response, null)
                } else {
                    // recursive retry
                    createCheckFunc(dataArray, condition, callback)
                }
            } else {
                callback(null, errorMessage)
            }
        }
    }

    fun checkReadable(callback: (Boolean) -> Unit) {
        println("check readable")
        val commandBytes = getCommandBytes(NFC_COMMAND_READABLE) ?: return callback(false)
        createCheckFunc(commandBytes, { response ->
            (response?.size ?: 0) >= 3 && (response!![2] and 0x29) == 0x29
        }, { response, errorMessage ->
            println("check readable response: $response")
            callback(response != null && response.isNotEmpty())
        })
    }

    fun checkWriteable(callback: (Boolean) -> Unit) {
        println("check writeable")

        val commandBytes = getCommandBytes(NFC_COMMAND_WRITEABLE) ?: return callback(false)

        createCheckFunc(
            commandBytes,
            { response ->
                (response?.size ?: 0) >= 3 && (response!![2] and 0x21) == 0x21
            },
            { response, errorMessage ->
                println("check writeable response: $response")
                callback(response != null && response.isNotEmpty())
            }
        )
    }

    fun checkWriteSuccess(callback: (Boolean) -> Unit) {
        val commandBytes = getCommandBytes(NFC_COMMAND_ACK)!!
    
        nfcCore.transceive(commandBytes) { success, errorMessage, response ->
            if (success) {
                when {
                    response == null -> {
                        println("some error")
                        callback(false)
                    }

                    response.size >= 10 && response[9].toInt() != 0 -> {
                        println("some error")
                        callback(false)
                    }
                    response.size > 1 && response[1].toInt() != 60 -> {
                        println("ack error")
                        callback(false)
                    }
                    else -> {
                        callback(true)
                    }
                }
            } else {
                // Optional: handle core.sendMifareCommand failure
                println("sendMifareCommand failed: $errorMessage")
                callback(false)
            }
        }
    }
    


    fun hexStrToDecimalList(hexString: String): List<Int> {
        val result = mutableListOf<Int>()
        var hex = hexString

        // Ensure even length
        if (hex.length % 2 != 0) {
            hex = "0$hex"
        }

        for (i in hex.indices step 2) {
            val byteStr = hex.substring(i, i + 2)
            val value = byteStr.toInt(16)  // parse hex to int
            result.add(value)
        }

        return result
    }

    fun <T> List<T>.safeSubList(start: Int, length: Int): List<T> {
        if (start >= this.size) return emptyList()
        val safeLength = minOf(length, this.size - start)
        return this.subList(start, start + safeLength)
    }

    fun hexArrToDecimalList(data: List<Any>): List<Int> {
        val result = mutableListOf<Int>()

        for (item in data) {
            when (item) {
                is Number -> result.add(item.toInt())      // already numeric
                is String -> result.add(item.toInt(16))   // hex string
                else -> {
                    println("Unsupported item type: $item")
                    // optionally add 0: result.add(0)
                }
            }
        }

        return result
    }

    fun listToHexString(list: List<Int>, padLength: Int = 2): String {
        return list.joinToString(separator = "") { it.toString(16).padStart(padLength, '0') }
    }

    fun getCommandBytes(command: String, data: Map<String, Any?>? = null): List<Int>? {
        return when (command) {
            NFC_COMMAND_WRITEABLE,
            NFC_COMMAND_READABLE -> encodeCommand(APP_NFC_STATUS_CHECK_COMMAND, needPad = false)

            NFC_COMMAND_ACK,
            NFC_COMMAND_RECEIVE_DATA -> encodeCommand(APP_NFC_READ_DEVICE_DATA_COMMAND, needPad = false)

            NFC_COMMAND_READ_FLASH -> {
                val cmd = "${appNfcCommandPrefix()}${APP_NFC_READ_PKT}05"
                encodeCommand(cmd, needPad = true)
            }

            NFC_COMMAND_WRITE_FLASH -> {
                val dataSize = data?.get("datasize")?.toString()?.toInt() ?: 0
                val password = data?.get("password")?.toString() ?: ""
                val cmd = "${appNfcCommandPrefix()}$APP_NFC_WRITE_PKT$APP_NFC_WRITE_FLASH" +
                        "${convertNumber(dataSize)}0000${strToCharCodeHexStr(password, needReverse = false)}"
                encodeCommand(cmd, needPad = true)
            }

            else -> null
        }
    }


    fun encodeCommand(command: String, needPad: Boolean): List<Int> {
        val paddedCommand = if (needPad) padCommand(command, "0", 134) else command
        return hexStrToDecimalList(paddedCommand)
    }

    fun padCommand(command: String, padString: String, targetLength: Int): String {
        return if (command.length < targetLength) {
            command.padEnd(targetLength, padString[0])
        } else {
            command
        }
    }

    fun numberToHexStr(num: Int, size: Int, signed: Boolean): String {
        val bytes = ByteArray(4) { 0 }

        when (size) {
            4 -> {
                val value = if (signed) num.toInt() else num.toUInt().toInt()
                for (i in 0 until 4) {
                    bytes[i] = ((value shr (8 * i)) and 0xFF).toByte()
                }
            }
            2 -> {
                val value = if (signed) num.toShort().toInt() else num.toUShort().toInt()
                for (i in 0 until 2) {
                    bytes[i] = ((value shr (8 * i)) and 0xFF).toByte()
                }
            }
            1 -> {
                val value = if (signed) num.toByte().toInt() else (num and 0xFF)
                bytes[0] = value.toByte()
            }
            else -> throw IllegalArgumentException("Unsupported size: $size")
        }

        // convert to hex string (little-endian)
        return bytes.take(size).joinToString("") { "%02x".format(it) }
    }

    fun strToCharCodeHexStr(str: String, needReverse: Boolean = false): String {
        val hexList = str.map { it.code.toString(16).padStart(2, '0') }.toMutableList()
        if (needReverse) hexList.reverse()
        return hexList.joinToString("")
    }

    fun convertNumber(number: Int, size: Int? = null): String {
        val numberSize = size ?: when {
            number in 0..255 -> 1
            number > 32767 -> 4
            else -> 2
        }
        return numberToHexStr(number, numberSize, signed = true)
    }

    fun jsonToMap(jsonStr: String): Map<String, Any?> {
        val json = JSONObject(jsonStr)
        return json.keys().asSequence().associateWith { key ->
            json.get(key)
        }
    }

    fun sendFlashData(data: List<Int>, dataSize: Int, callback: (Boolean) -> Unit) {
        val sendData = hexArrToDecimalArr(data)
        val sendDataPrefix = encodeCommand(APP_NFC_SEND_DEVICE_COMMAND, needPad = false)
        val sendCount = getSendCount(dataSize)
        totalProgress = sendCount * 2
        println("send flash data send count $sendCount")

        sendFlashDataWithCount(sendCount, 0, sendData, sendDataPrefix, callback)
    }

    fun sendFlashDataWithCount(
        count: Int,
        index: Int,
        data: List<Int>,
        prefix: List<Int>,
        callback: (Boolean) -> Unit
    ) {
        if (index >= count) {
            callback(true)
            return
        }

     
        val suffixData = data.safeSubList(index * 64, 64)
        val transceiveData = (prefix + suffixData).toMutableList()

        // Pad to 67 bytes
        while (transceiveData.size < 67) {
            transceiveData.add(0)
        }

        checkWriteable { success ->
            setProgress(++currentProgress)
            if (success) {
                createCheckFunc(transceiveData,   { response ->
                    response?.isNotEmpty() ?: false
                }) { response, errorMessage ->
                    setProgress(++currentProgress)
                    if (response?.isNotEmpty() ?: false) {
                        sendFlashDataWithCount(count, index + 1, data, prefix, callback)
                    } else {
                        println("send flash data failed")
                        callback(false)
                    }
                }
            } else {
                println("check writeable failed")
                callback(false)
            }
        }
    }

    fun hexArrToDecimalArr(data: List<Any>): List<Int> {
        val result = mutableListOf<Int>()

        for (item in data) {
            when (item) {
                is Number -> {
                    // Already numeric → push directly
                    result.add(item.toInt())
                }
                is String -> {
                    // Convert hex string to int
                    try {
                        val value = item.toInt(16)
                        result.add(value)
                    } catch (e: NumberFormatException) {
                        println("Invalid hex string: $item")
                        result.add(0)
                    }
                }
                else -> {
                    // Unsupported type → ignore or push 0
                    println("Unsupported item type: $item")
                    result.add(0)
                }
            }
        }

        return result
    }






}