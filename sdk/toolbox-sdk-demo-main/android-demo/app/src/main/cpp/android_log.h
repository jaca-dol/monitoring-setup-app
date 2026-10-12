
#ifndef _JNI_ANDROID_LOG_H
#define _JNI_ANDROID_LOG_H

#ifdef JNI_LOG

#include <android/log.h>

#define TAG "nfc_lib_jni"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)
#define LOGA(...) __android_log_print(ANDROID_LOG_DEBUG, TAG, __VA_ARGS__)
#define LOGF(A)   __android_log_print(ANDROID_LOG_DEBUG, TAG, "=== %s === %s", __FUNCTION__, A)

#else

#include <stdio.h>

#define LOGI(...) do {printf(__VA_ARGS__); printf("\r\n");} while(0)
#define LOGD(...) do {printf(__VA_ARGS__); printf("\r\n");} while(0)
#define LOGW(...) do {printf(__VA_ARGS__); printf("\r\n");} while(0)
#define LOGE(...) do {printf(__VA_ARGS__); printf("\r\n");} while(0)
#define LOGA(...) do {printf(__VA_ARGS__); printf("\r\n");} while(0)
#define LOGF(A)   printf("=== %s === %s\r\n", __FUNCTION__, A)

#endif

#endif
