package com.milesight.android_demo
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

object ModalManager {

    private val _content = MutableStateFlow("")
    val content = _content.asStateFlow()

    private val _title = MutableStateFlow("")
    val title = _title.asStateFlow()

    private val _showModal = MutableStateFlow(false)
    val showModal = _showModal.asStateFlow()

    fun show(t: String, c: String) {
        Handler(Looper.getMainLooper()).postDelayed({
            _title.value = t
            _content.value = c
            _showModal.value = true
        }, 500)
//        Handler(Looper.getMainLooper()).post {

//        }
    }


    fun hide() {
        Handler(Looper.getMainLooper()).postDelayed({
            _showModal.value = false
        }, 300)
    }
}
