package com.milesight.android_demo.NFC

import android.nfc.Tag
import android.nfc.tech.*
import android.util.Log

class TagTechnologyRequest(
    private val techTypes: ArrayList<Any>,
) {

    companion object {
        const val LOG_TAG = "NFCore-tech"
    }

    private var tagHandle: Tag? = null
    private var techHandle: TagTechnology? = null
    private var techType: String? = null

    fun getTechType(): String? = techType
    fun getTechHandle(): TagTechnology? = techHandle
    fun getTagHandle(): Tag? = tagHandle
    fun isConnected(): Boolean = techHandle != null

    fun connect(tag: Tag?): Boolean {
        if (tag == null) {
            Log.d(LOG_TAG, "received null tag at connect()")
            return false
        }

        for (item in techTypes) {
            val type = item as? String ?: continue

            techHandle = when (type) {
                "Ndef"            -> Ndef.get(tag)
                "NfcA"            -> NfcA.get(tag)
                "NfcB"            -> NfcB.get(tag)
                "NfcF"            -> NfcF.get(tag)
                "NfcV"            -> NfcV.get(tag)
                "IsoDep"          -> IsoDep.get(tag)
                "MifareClassic"   -> MifareClassic.get(tag)
                "MifareUltralight"-> MifareUltralight.get(tag)
                else -> null
            }

            if (techHandle == null) continue

            try {
                Log.d(LOG_TAG, "connect to $type")
                techHandle!!.connect()

                techType = type
                tagHandle = tag
                return true
            } catch (ex: Exception) {
                Log.d(LOG_TAG, "fail to connect tech: $type")
            }
        }

        // restore
        techHandle = null
        techType = null
        tagHandle = null
        return false
    }

    fun close() {
        try {
            techHandle?.close()
        } catch (ex: Exception) {
            Log.d(LOG_TAG, "fail to close tech")
        }
    }
}
