package com.milesight.android_demo

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.milesight.android_demo.NFC.*
import com.milesight.android_demo.ui.theme.AndroiddemoTheme


class MainActivity : ComponentActivity() {
    val service = NFCService(this)
    var flashInfo: Map<String, Any?>? = null
    var rawData: List<Int>? = null
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AndroiddemoTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    ContentView(
                        buttonLight = 1,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        service.nfcCore.onHostResume()
    }

    override fun onPause() {
        super.onPause()
        service.nfcCore.onHostPause()
    }

    override fun onDestroy() {
        super.onDestroy()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        println("on new intent :$intent")
        intent?.let {
            service.nfcCore.parseNfcIntent(intent)
        }

    }
}


@Composable
fun ContentView(buttonLight: Int, modifier: Modifier = Modifier) {

    val context: Context = LocalContext.current
    var buttonLight by remember { mutableStateOf<Int?>(null) }
    var writeButtonLight by remember { mutableStateOf("") }
    Column(
        modifier = modifier.fillMaxWidth()
    ) {
        Row(

            verticalAlignment =  Alignment.CenterVertically
        ) {


            Button(onClick = {
                ModalManager.show("scan", "hold the tag")

                val activity = context as MainActivity
                println("start detecting")

                activity.service.readFlash(){ result, flashInfo, rawData ->
                    println("detect result: $flashInfo")
                    flashInfo ?.let {
                        activity.flashInfo = flashInfo
                        activity.rawData = rawData
                        buttonLight = flashInfo["buttonLight"] as Int
                    }
                }
            }) {
                Text("Read")
            }

            Spacer(modifier = Modifier.width(16.dp))

            val content by ModalManager.content.collectAsState()
            Text(
                "buttonLight $buttonLight",
            )

        }


        Row(

            verticalAlignment =  Alignment.CenterVertically
        ) {


            Button(onClick = {
                ModalManager.show("scan", "hold the tag")

                val activity = context as MainActivity
                if (activity.flashInfo == null || activity.rawData == null) {
                    ModalManager.show("error", "please read flash first")
                    return@Button
                }

                val newDeviceSettingInfo = mapOf("buttonLight" to writeButtonLight.toInt())
                val newFlashInfo = activity.flashInfo!! + newDeviceSettingInfo
                activity.service.writeFlash(newFlashInfo, activity.flashInfo!!, activity.rawData!!) { success ->
                    if (success) {
                        ModalManager.show("success", "write flash success")
                    } else {
                        ModalManager.show("error", "write flash failed")
                    }
                }
            }) {
                Text("Write")
            }

            Spacer(modifier = Modifier.width(16.dp))

            val content by ModalManager.content.collectAsState()
            Text(
                "buttonLight ",
            )

            TextField(
                value = writeButtonLight,
                onValueChange = { writeButtonLight = it },
                label = { Text("") }
            )

        }

        SimpleModal()
    }
}

@Composable
fun SimpleModal() {
    val show by ModalManager.showModal.collectAsState()
    val title by ModalManager.title.collectAsState()
    val content by ModalManager.content.collectAsState()

    if (show) {
        // Force recomposition when content changes
//        key(title, content) {
            Dialog(onDismissRequest = { ModalManager.hide() }) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    tonalElevation = 6.dp,
                    modifier = Modifier.padding(20.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(title, style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(16.dp))
                        Text(content, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(24.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedButton(onClick = { ModalManager.hide() }) { Text("Cancel") }
                        }
                    }
                }
            }
//        }
    }
}



@Preview(showBackground = true)
@Composable
fun ReadViewPreview() {
    AndroiddemoTheme {
        ContentView(1, modifier= Modifier.padding(30.dp))
    }
}
