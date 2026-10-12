// Write C++ code here.
//
// Do not forget to dynamically load the C++ library into your application.
//
// For instance,
//
// In MainActivity.java:
//    static {
//       System.loadLibrary("toolbox-sdk");
//    }
//
// Or, in MainActivity.kt:
//    companion object {
//      init {
//         System.loadLibrary("toolbox-sdk")
//      }
//    }

#include <jni.h>
#include <android/log.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef  __cplusplus
extern  "C" {
#endif

#include "nfc_app.h"
#include "aes.h"
#include "node_lzss.h"
#include "bmp2hex.h"
#include "cJSON.h"
#include "app_card.h"
#include "unxx_crc32.h"
#include "main_version.h"

#define TAG "DeviceUtils-jni" // 这个是自定义的LOG的标识
#define LOGD(...)  __android_log_print(ANDROID_LOG_DEBUG,TAG,__VA_ARGS__) // 定义LOGD类型


//处理UTF-8编码的非法字节
int sanitize_utf8(char *data, int len) {
    int i = 0;

    while (i < len) {
        unsigned char c = data[i];
        if (c < 0x80) {
            i++;
            continue;
        } else if ((c >> 5) == 0x6 && i + 1 < len && (data[i + 1] & 0xC0) == 0x80) {
            i += 2;
            continue;
        } else if ((c >> 4) == 0xE && i + 2 < len &&
                   (data[i + 1] & 0xC0) == 0x80 && (data[i + 2] & 0xC0) == 0x80) {
            i += 3;
            continue;
        } else if ((c >> 3) == 0x1E && i + 3 < len &&
                   (data[i + 1] & 0xC0) == 0x80 && (data[i + 2] & 0xC0) == 0x80 &&
                   (data[i + 3] & 0xC0) == 0x80) {
            i += 4;
            continue;
        } else {
            data[i] = '?'; // 替换非法字节
            i++;
        }
    }
    return 1;
}


JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getFlashBaseInfo(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jint i;
    char *result;
    jbyte *c_array;
    jint arr_len;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    arr_len = env->GetArrayLength(j_array);
    result = get_flash_base_info((char *) c_array, arr_len);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    sanitize_utf8(result, strlen(result));

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getFlashProductInfo(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jint i;
    char *result;
    jbyte *c_array;
    jint arr_len;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    arr_len = env->GetArrayLength(j_array);
    result = get_flash_product_info((char *) c_array, arr_len);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_aesDecryp(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jint size;
    char *result;
    jbyte *c_array;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);
    result = aes_decryp((char *) c_array, size);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

jbyte s_result_str[8];

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_Encode(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                       jbyteArray out_array) {
    jint size = 0;
    char *result;
    jbyte *c_array;
    jbyte *c_out_array;
    jint out_size = 0;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);

    c_out_array = env->GetByteArrayElements(out_array, NULL);
    if (c_out_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    Encode((uint8_t *) c_array, size, (uint8_t *) c_out_array, (uint16_t *) &out_size);

    snprintf((char *) s_result_str, sizeof(s_result_str), "%d", out_size);

    env->ReleaseByteArrayElements(out_array, c_out_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_Decode(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                       jbyteArray out_array) {
    jint size = 0;
    char *result;
    jbyte *c_array;
    jbyte *c_out_array;
    jint out_size = 0;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);

    c_out_array = env->GetByteArrayElements(out_array, NULL);
    if (c_out_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    Decode((uint8_t *) c_array, size, (uint8_t *) c_out_array, (uint16_t *) &out_size);

    snprintf((char *) s_result_str, sizeof(s_result_str), "%d", out_size);

    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(out_array, c_out_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_bmp2hex(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                        jbyteArray out_array) {
    jint size = 0;
    char *result;
    jbyte *c_array;
    jbyte *c_out_array;
    jint out_size = 0;
    jint ret = 0;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);

    c_out_array = env->GetByteArrayElements(out_array, NULL);
    if (c_out_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    ret = bitmap_to_hex((char *) c_array, size, (char *) c_out_array, (int *) &out_size);
    if (ret) {
        out_size = ret;
    }

    snprintf((char *) s_result_str, sizeof(s_result_str), "%d", out_size);

    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(out_array, c_out_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_wt30xBmp2Hex(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                             jbyteArray out_array) {
    jint size = 0;
    char *result;
    jbyte *c_array;
    jbyte *c_out_array;
    jint out_size = 0;
    jint ret = 0;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);

    c_out_array = env->GetByteArrayElements(out_array, NULL);
    if (c_out_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    ret = bitmap_to_hex_wt30x((char *) c_array, size, (char *) c_out_array, (int *) &out_size);
    if (ret) {
        out_size = ret;
    }

    snprintf((char *) s_result_str, sizeof(s_result_str), "%d", out_size);

    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(out_array, c_out_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getStatusBaseInfo(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jint i;
    char *result;
    jbyte *c_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    result = get_status_info((char *) c_array);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_setFlashBaseInfo(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                                 jstring json) {
    jint i;
    char *result;
    jbyte *c_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    char *strJSON = (char *) env->GetStringUTFChars(json, NULL);
    result = set_flash_base_info((char *) c_array, strJSON);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jint JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_setFlashBaseInfoToUnp(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                                      jbyteArray j_unp_array, jstring json) {
    jint i;
    jint result;
    jbyte *c_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    jbyte *unp_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    unp_array = env->GetByteArrayElements(j_unp_array, NULL);
    if (unp_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    char *strJSON = (char *) env->GetStringUTFChars(json, NULL);
    result = set_flash_base_info_to_unp_sct((char *) c_array, strJSON, (char *) unp_array);
    env->ReleaseByteArrayElements(j_unp_array, unp_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    // return env->NewStringUTF(result);
    return result;
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getHistoryInfo(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                               jstring model, jstring firmware, jstring hardware) {

    jint i;
    char *result;
    jbyte *c_array;
    jint arr_len;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    arr_len = env->GetArrayLength(j_array);

    char *c_model = (char *) env->GetStringUTFChars(model, NULL);
    char *c_firmware = (char *) env->GetStringUTFChars(firmware, NULL);
    char *c_hardware = (char *) env->GetStringUTFChars(hardware, NULL);

    if (c_model == NULL) {
        return 0;
    }
    result = get_histroy_data_json((char *) c_array, arr_len, (char *) c_model, (char *) c_firmware,
                                   (char *) c_hardware);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getCardInfo(JNIEnv *env, jobject thiz, jbyteArray jCardData,
                                            jbyteArray jOutputCardData, jobject jCardInfo) {
    struct card_header_s cardHeader;

    //可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    jbyte *cCardData = env->GetByteArrayElements(jCardData, NULL);
    if (cCardData == NULL) {
        return 0;   //JVM复制原始数据到缓冲区失败
    }
    jint cardDataCount = env->GetArrayLength(jCardData);

    //输出的card data
    int outputDataSize = env->GetArrayLength(jOutputCardData);
    jbyte *coutputData = env->GetByteArrayElements(jOutputCardData, NULL);

    //获取CardInfoClass类的Class引用
    jclass infoClass = env->GetObjectClass(jCardInfo);
    if (infoClass == NULL) {
        return 0;
    }

    //获取类实例的属性ID
    jfieldID cardVersionFid = env->GetFieldID(infoClass, "cardVersion", "I");
    jfieldID cardStatusFid = env->GetFieldID(infoClass, "cardStatus", "I");
    jfieldID keyModeFid = env->GetFieldID(infoClass, "keyMode", "I");
    jfieldID dataSizeFid = env->GetFieldID(infoClass, "dataSize", "I");

    int dataSize = app_card_read(&cardHeader, (uint8_t *) cCardData, cardDataCount,
                                 (uint8_t *) coutputData, outputDataSize);
    char *cDeviceInfoJson = get_flash_base_info((char *) coutputData, dataSize);

    env->SetIntField(jCardInfo, cardVersionFid, (jint) cardHeader.info.Fields.version);
    env->SetIntField(jCardInfo, cardStatusFid, (jint) cardHeader.info.Fields.ntag_status);
    env->SetIntField(jCardInfo, keyModeFid, (jint) cardHeader.info.Fields.key_mode);
    env->SetIntField(jCardInfo, dataSizeFid, (jint) dataSize);

    env->ReleaseByteArrayElements(jCardData, cCardData, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(jOutputCardData, coutputData, 0); // 释放可能复制的缓冲区
    env->DeleteLocalRef(infoClass); //删除局部引用

    return env->NewStringUTF(cDeviceInfoJson);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_setCardInfo(JNIEnv *env, jobject thiz, jbyteArray jCardData,
                                            jstring json, jobject jCardInfo,
                                            jbyteArray jOutputCardData) {
    //可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    jbyte *cCardData = env->GetByteArrayElements(jCardData, NULL);
    if (cCardData == NULL) {
        return 0;   //JVM复制原始数据到缓冲区失败
    }
    jint cardDataCount = env->GetArrayLength(jCardData);

    //输出的card data
    int outputDataSize = env->GetArrayLength(jOutputCardData);
    jbyte *coutputData = env->GetByteArrayElements(jOutputCardData, NULL);

    //获取CardInfoClass类的Class引用
    jclass infoClass = env->GetObjectClass(jCardInfo);
    if (infoClass == NULL) {
        return 0;
    }

    //获取类实例的属性ID
    jfieldID cardVersionFid = env->GetFieldID(infoClass, "cardVersion", "I");
    jfieldID cardStatusFid = env->GetFieldID(infoClass, "cardStatus", "I");
    jfieldID keyModeFid = env->GetFieldID(infoClass, "keyMode", "I");
    jfieldID dataSizeFid = env->GetFieldID(infoClass, "dataSize", "I");

    jint cardVersion = env->GetIntField(jCardInfo, cardVersionFid);
    jint cardStatus = env->GetIntField(jCardInfo, cardStatusFid);
    jint keyMode = env->GetIntField(jCardInfo, keyModeFid);

    struct card_header_s cardHeader;
    cardHeader.info.Fields.version = cardVersion;
    cardHeader.info.Fields.key_mode = keyMode;
    cardHeader.info.Fields.ntag_status = cardStatus;

    char *strJSON = (char *) env->GetStringUTFChars(json, NULL);
    char *csetInfoJson = set_flash_base_info((char *) cCardData, strJSON);

    cJSON *cSetResult = cJSON_Parse(csetInfoJson);
    cJSON *setDataSizeItem = cJSON_GetObjectItem(cSetResult, "datasize");
    int setDataSize = setDataSizeItem->valueint;
    int writeCardDataSize = app_card_write(&cardHeader, (uint8_t *) cCardData, setDataSize,
                                           (uint8_t *) coutputData, outputDataSize);

    env->SetIntField(jCardInfo, dataSizeFid, (jint) writeCardDataSize);
    env->ReleaseByteArrayElements(jCardData, cCardData, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(jOutputCardData, coutputData, 0); // 释放可能复制的缓冲区
    env->DeleteLocalRef(infoClass); //删除局部引用

    return env->NewStringUTF(csetInfoJson);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getDs3604TemplateInfo(JNIEnv *env, jobject thiz,
                                                      jbyteArray j_array) {
    jint i;
    char *result;
    jbyte *c_array;
    jint arr_len;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    arr_len = env->GetArrayLength(j_array);
    result = get_ds3604_template((char *) c_array, arr_len);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_setDs3604TemplateInfo(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                                      jstring json) {
    jint i;
    char *result;
    jbyte *c_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    char *strJSON = (char *) env->GetStringUTFChars(json, NULL);
    result = set_ds3604_template((char *) c_array, strJSON);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getDS3604PictureData(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                                     jbyteArray out_array) {
    jint size = 0;
    char *result;
    jbyte *c_array;
    jbyte *c_out_array;
    jint out_size = 0;
    jint ret = 0;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);

    c_out_array = env->GetByteArrayElements(out_array, NULL);
    if (c_out_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    ret = get_ds3604_picture((char *) c_array, (char *) c_out_array);
    if (ret) {
        out_size = ret;
    }

    snprintf((char *) s_result_str, sizeof(s_result_str), "%d", out_size);

    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(out_array, c_out_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_setDS3604PictureData(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                                     jbyteArray out_array) {
    jint size = 0;
    char *result;
    jbyte *c_array;
    jbyte *c_out_array;
    jint out_size = 0;
    jint ret = 0;

    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    size = env->GetArrayLength(j_array);

    c_out_array = env->GetByteArrayElements(out_array, NULL);
    if (c_out_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }

    ret = set_ds3604_picture((char *) c_array, (char *) c_out_array);
    if (ret) {
        out_size = ret;
    }

    snprintf((char *) s_result_str, sizeof(s_result_str), "%d", out_size);

    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    env->ReleaseByteArrayElements(out_array, c_out_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jint JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_crc32(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jbyte *c_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    jint dataCount = env->GetArrayLength(j_array);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    // LOGD("before my_ether_crc32");
    uint32_t result = my_ether_crc32(0, (uint8_t *) c_array, dataCount);
    // LOGD("after my_ether_crc32 %d", result);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区
    // LOGD("before return");
    return (jint) result;
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getSdiBaseInfo(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jint i;
    char *result;
    jbyte *c_array;
    jint arr_len;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    arr_len = env->GetArrayLength(j_array);
    result = get_sdi_base_info((char *) c_array, arr_len);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_setSdiBaseInfo(JNIEnv *env, jobject thiz, jbyteArray j_array,
                                               jstring json) {
    jint i;
    char *result;
    jbyte *c_array;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    char *strJSON = (char *) env->GetStringUTFChars(json, NULL);
    result = set_sdi_base_info((char *) c_array, strJSON);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}

JNIEXPORT jstring JNICALL
Java_com_milesight_android_1demo_ToolboxSdkModule_getD2dPairInfo(JNIEnv *env, jobject thiz, jbyteArray j_array) {
    jint i;
    char *result;
    jbyte *c_array;
    jint arr_len;
    // 可能数组中的元素在内存中是不连续的，JVM可能会复制所有原始数据到缓冲区，然后返回这个缓冲区的指针
    c_array = env->GetByteArrayElements(j_array, NULL);
    if (c_array == NULL) {
        return 0;   // JVM复制原始数据到缓冲区失败
    }
    arr_len = env->GetArrayLength(j_array);
    result = get_d2d_pairinfo((char *) c_array, arr_len);
    env->ReleaseByteArrayElements(j_array, c_array, 0); // 释放可能复制的缓冲区

    return env->NewStringUTF(result);
}
}