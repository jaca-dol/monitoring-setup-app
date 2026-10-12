package com.milesight.android_demo

import android.content.ContentResolver
import android.net.Uri
import android.os.Environment
import android.util.Base64
import android.util.Log
import com.alibaba.fastjson.JSON
import java.io.File
import java.io.IOError


class ToolboxSdkModule {

    //获取设备信息
    external fun getFlashBaseInfo(data: ByteArray?): String?


    //写入设备配置
    external fun setFlashBaseInfo(data: ByteArray?, json: String?): String?

    /**
     * 获取设备信息
     * @param data 从设备端读回来的flash数据
     */

    fun getFlashInfo(
        data: List<Int>
    ): String? { //this method will be called from JS by React Native
        val arr = ByteArray(data.size)
        for (i in 0..<data.size) {
            arr[i] = (data[i] and 0xFF).toByte()
        }
        val formattedString = getFlashBaseInfo(arr)
        return formattedString
    }

    fun setFlashInfo(data: List<Int>, json: String?): Map<String?, Any?> {
        val arr = ByteArray(data.size)
        for (i in 0..<data.size) {
            arr[i] = (data[i] and 0xFF).toByte()
        }
        val result: String? = setFlashBaseInfo(arr, json)
        val map: MutableMap<String?, Int> = JSON.parse(result) as MutableMap<String?, Int>
        val finalResult: MutableMap<String?, Any?> = mutableMapOf()
        val code: Int = map["code"]!!

        finalResult["code"] = code
        finalResult["result"] = result

        if (code == 1) {
            val writeArray: MutableList<Int> = mutableListOf()

            for (i in arr.indices) {
                writeArray.add(arr[i].toInt())
            }
            finalResult["rawData"] = writeArray
        }


        return finalResult
    }

  companion object {
      init {
          System.loadLibrary("codec-lib")
      }

      const val NAME = "DeviceUtils"
  }
}
