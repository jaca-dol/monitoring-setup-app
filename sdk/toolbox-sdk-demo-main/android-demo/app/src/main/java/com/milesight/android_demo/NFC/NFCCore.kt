package com.milesight.android_demo.NFC

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.content.IntentFilter.MalformedMimeTypeException
import android.nfc.NdefMessage
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.nfc.tech.MifareClassic
import android.nfc.tech.MifareUltralight
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.nfc.tech.NfcA
import android.nfc.tech.NfcB
import android.nfc.tech.NfcF
import android.nfc.tech.NfcV
import android.os.Build
import android.util.Log


class NFCCore(private val context: Activity) {

    companion object {
        private const val LOG_TAG: String = "NFCCore"
    }

    class WriteNdefRequest internal constructor(
        var message: NdefMessage?,
        format: Boolean,
        formatReadOnly: Boolean
    ) {
        var format: Boolean
        var formatReadOnly: Boolean

        init {
            this.format = format
            this.formatReadOnly = formatReadOnly
        }
    }

    private var isForegroundEnabled = false
    private val intentFilters: MutableList<IntentFilter?> = ArrayList<IntentFilter?>()
    private val techLists = ArrayList<Array<String?>?>()
    private var isResumed = false
    private var tag: Tag? = null
    private var readerModeFlags = 0
    private var cleanUpTagRegistration = false
    private var writeNdefRequest: WriteNdefRequest? = null
    private var techRequest: TagTechnologyRequest? = null
    private var detectResult: ((Boolean) -> Unit)? = null

    fun hasTagEventRegistration(): Boolean {
        Log.d(LOG_TAG, "isSessionAvailable: $isForegroundEnabled")
        return isForegroundEnabled
    }

    private fun registerTagEvent() {
        Log.d(LOG_TAG, "registerTag")
        isForegroundEnabled = true

        // capture all mime-based dispatch NDEF
        val ndef = IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED)
        try {
            ndef.addDataType("*/*")
        } catch (e: MalformedMimeTypeException) {
            throw RuntimeException("fail", e)
        }
        intentFilters.add(ndef)

        // capture all rest NDEF, such as uri-based
        intentFilters.add(IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED))
        techLists.add(arrayOf(Ndef::class.java.name))

        // for those without NDEF, get them as tags
        intentFilters.add(IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED))

        if (isResumed) {
            enableDisableForegroundDispatch(true)
        }
    }

    fun onHostResume() {
        Log.d(LOG_TAG, "onResume");
        isResumed = true;
        if (isForegroundEnabled) {
            enableDisableForegroundDispatch(true);
        }
    }

    fun onHostPause() {
        Log.d(LOG_TAG, "onPause")
        isResumed = false
        enableDisableForegroundDispatch(false)
    }

    fun getTag(): Any? {
        synchronized(this) {
            val request = techRequest
            if (request != null) {
                try {
                    val tag = request.getTagHandle()
                    if (tag?.techList?.contains(Ndef::class.java.name) == true) {

                        val ndef = Ndef.get(tag)
                        return ndef

                    } else {
                        return tag
                    }



                } catch (e: Exception) {
                    Log.d(LOG_TAG, "getTag fail")
                    return null
                }

            } else {
                Log.d(LOG_TAG, "no tech request available")
                return null
            }
        }
    }

    fun transceive(array: List<Int>, callback: (isSuccess:Boolean, error: String?, result: List<Int>?) -> Unit) {
        synchronized(this) {
            val request = techRequest
            if (request == null) {
                callback(false, "no tech request available", null)
                return
            }

            try {
                val tech = request.getTechType()
                val bytes: ByteArray = array.map { it.toByte() }.toByteArray()

                val baseTechHandle = request.getTechHandle()

                val resultBytes: ByteArray = when (tech) {
                    "NfcA" -> (baseTechHandle as NfcA).transceive(bytes)
                    "NfcB" -> (baseTechHandle as NfcB).transceive(bytes)
                    "NfcF" -> (baseTechHandle as NfcF).transceive(bytes)
                    "NfcV" -> (baseTechHandle as NfcV).transceive(bytes)
                    "IsoDep" -> (baseTechHandle as IsoDep).transceive(bytes)
                    "MifareClassic" -> (baseTechHandle as MifareClassic).transceive(bytes)
                    "MifareUltralight" -> (baseTechHandle as MifareUltralight).transceive(bytes)
                    else -> {
                        Log.d(LOG_TAG, "transceive not supported")
                        callback(false, "transceive not supported", null)
                        return
                    }
                }

                val resultArray = resultBytes.map { it.toInt() }.toList()
                callback(true, null, resultArray)

            } catch (ex: Exception) {
                Log.d(LOG_TAG, "transceive fail: ${ex.message}")
                callback(false, "transceive fail", null)
            }
        }
    }



    private fun enableDisableForegroundDispatch(enable: Boolean) {
        Log.i(LOG_TAG, "enableForegroundDispatch, enable = " + enable)
        val nfcAdapter = NfcAdapter.getDefaultAdapter(context)
        val currentActivity: Activity = context
        if (nfcAdapter != null && !currentActivity.isFinishing) {
            try {
                if (enable) {
                    nfcAdapter.enableForegroundDispatch(
                        currentActivity,
                        getPendingIntent(),
                        getIntentFilters(),
                        getTechLists()
                    )
                } else {
                    nfcAdapter.disableForegroundDispatch(currentActivity)
                }
            } catch (e: IllegalStateException) {
                Log.w(
                    LOG_TAG,
                    "Illegal State Exception starting NFC. Assuming application is terminating."
                )
            } catch (e: NullPointerException) {
                Log.w(
                    LOG_TAG,
                    "Illegal State Exception starting NFC. Assuming application is terminating."
                )
            }
        }
    }

    private fun getPendingIntent(): PendingIntent? {
        val activity: Activity = context
        val intent = Intent(activity, activity.javaClass)
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)

        var flag = 0
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flag = PendingIntent.FLAG_MUTABLE
        }
        return PendingIntent.getActivity(activity, 0, intent, flag)
    }

    private fun getIntentFilters(): Array<IntentFilter?> {
        return intentFilters.toTypedArray<IntentFilter?>()
    }

    private fun getTechLists(): Array<Array<String?>?> {
        return techLists.toArray<Array<String?>?>(Array<Array<String?>?>(0) { arrayOfNulls<String>(0) })
    }


    fun requestTechnology(tech: String, callback: (Boolean) -> Unit) {
        Log.d(LOG_TAG, "requestTechnology: $tech")

        detectResult = callback
        if(!this.hasTagEventRegistration()) {
            this.registerTagEvent()
        }

        this.cleanUpTagRegistration = true

        synchronized(this) {
            if (!isForegroundEnabled) {
                println("you should requestTagEvent first")
                return
            }
            if (hasPendingRequest()) {
                println("You can only issue one request at a time")
            } else {
                techRequest = TagTechnologyRequest(arrayListOf(tech))
            }
        }
    }

    fun cancelTechnologyRequest() {
        synchronized(this) {
            if (techRequest != null) {
                println("cancel technology")
                detectResult = null
                techRequest!!.close()
                techRequest = null

            }

            if (hasTagEventRegistration()) {
                unregisterTagEvent()
            }
        }
    }

    private fun unregisterTagEvent() {
        Log.d(LOG_TAG, "registerTag")
        isForegroundEnabled = false
        intentFilters.clear()
        if (isResumed) {
            enableDisableForegroundDispatch(false)
        }
    }

    private fun writeNdef(tag: Tag, request: WriteNdefRequest) {
        val message = request.message
        val formatReadOnly = request.formatReadOnly
        val format = request.format

        if (format || formatReadOnly) {
            try {
                Log.d(LOG_TAG, "ready to writeNdef")
                val formatable = NdefFormatable.get(tag)
                if (formatable == null) {
                    println("fail to apply ndef formatable tech")
                    detectResult?.invoke(false)
                } else {
                    Log.d(LOG_TAG, "ready to format ndef, seriously")
                    formatable.connect()
                    if (formatReadOnly) {
                        formatable.formatReadOnly(message)
                    } else {
                        formatable.format(message)
                    }
                    detectResult?.invoke(true)
                }
            } catch (ex: Exception) {
                println("writeNdef fail: ${ex.message}")
                detectResult?.invoke(false)
            }
        } else {
            try {
                Log.d(LOG_TAG, "ready to writeNdef")
                val ndef = Ndef.get(tag)
                when {
                    ndef == null -> {
                        println("fail to apply ndef tech")
                        detectResult?.invoke(false)
                    }
                    !ndef.isWritable -> {
                        println("tag is not writeable")
                        detectResult?.invoke(false)
                    }
                    ndef.maxSize < (message?.toByteArray()?.size ?: 0) -> {
                        println("tag size is not enough")
                        detectResult?.invoke(false)
                    }
                    else -> {
                        Log.d(LOG_TAG, "ready to writeNdef, seriously")
                        ndef.connect()
                        ndef.writeNdefMessage(message)
                        detectResult?.invoke(true)
                    }
                }
            } catch (ex: Exception) {
                println("writeNdef fail: ${ex.message}")
                detectResult?.invoke(false)
            }
        }
    }


    fun parseNfcIntent(intent: Intent): Map<String, Any?>? {
        Log.d(LOG_TAG, "parseIntent $intent")
        val action = intent.action
        Log.d(LOG_TAG, "action $action")
        if (action == null) return null

        val tag: Tag? = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        if (tag == null) return null

        synchronized(this) {
            writeNdefRequest?.let { request ->
                writeNdef(tag, request)
                writeNdefRequest = null
                // explicitly return null, to avoid extra detection
                return null
            }

            techRequest?.let { request ->
                if (!request.isConnected()) {
                    val result = request.connect(tag)
                    if (result) {
                        detectResult?.invoke(true)
                    } else {
                        println("fail to connect tag")
                        detectResult?.invoke(false)
                        techRequest = null
                    }
                }
                // explicitly return null, to avoid extra detection
                return null
            }
        }

        return null

//        return when (action) {
//            NfcAdapter.ACTION_NDEF_DISCOVERED -> {
//                val ndef = Ndef.get(tag)
//                val messages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES) as? Array<NdefMessage>
//                return null
//            }
//
//            NfcAdapter.ACTION_TECH_DISCOVERED -> {
//                if (tag.techList.contains(Ndef::class.java.name)) {
//                    val ndef = Ndef.get(tag)
//
//                } else {
//
//                }
//            }
//
//            NfcAdapter.ACTION_TAG_DISCOVERED -> {
//
//            }
//
//            else -> null
//        }
    }


    private fun hasPendingRequest(): Boolean {
        return writeNdefRequest != null || techRequest != null
    }
}