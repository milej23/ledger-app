package com.ledger.app

import android.Manifest
import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader

    // PendingStore.drain() is destructive (empties the queue on read), so it
    // must never be called before the page has actually defined
    // window.addFromWidget — otherwise queued widget entries are silently
    // lost. onResume() fires well before the async asset load finishes, so
    // it must wait for pageReady rather than flushing unconditionally.
    private var pageReady = false

    // Frequency the web page asked for while a permission prompt is in
    // flight; applied once the user answers it.
    private var pendingFrequency: String? = null

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val frequency = pendingFrequency ?: "off"
            pendingFrequency = null
            if (granted) ReminderScheduler.schedule(this, frequency)
            notifyWeb(granted, if (granted) frequency else "off")
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)
        webView.addJavascriptInterface(ReminderBridge(), "NativeBridge")

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                pageReady = true
                flushPending()
            }
        }

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onResume() {
        super.onResume()
        // Covers returning to an already-loaded page (e.g. after the widget
        // popup finishes) — onPageFinished won't fire again in that case.
        if (pageReady) flushPending()
    }

    private fun flushPending() {
        val pending = PendingStore.drain(this)
        for (text in pending) {
            val jsLiteral = JSONObject.quote(text)
            webView.evaluateJavascript(
                "window.addFromWidget && window.addFromWidget($jsLiteral);",
                null
            )
        }
    }

    private fun applyReminderFrequency(frequency: String) {
        if (frequency == "off") {
            ReminderScheduler.schedule(this, "off")
            notifyWeb(true, "off")
            return
        }
        if (hasNotificationPermission()) {
            ReminderScheduler.schedule(this, frequency)
            notifyWeb(true, frequency)
        } else {
            pendingFrequency = frequency
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun hasNotificationPermission(): Boolean {
        // POST_NOTIFICATIONS is only a runtime permission from Android 13
        // (API 33) onward; below that, notifications just work.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    private fun notifyWeb(granted: Boolean, frequency: String) {
        runOnUiThread {
            webView.evaluateJavascript(
                "window.onReminderFrequencyResult && window.onReminderFrequencyResult($granted, ${JSONObject.quote(frequency)});",
                null
            )
        }
    }

    private inner class ReminderBridge {
        @JavascriptInterface
        fun getFrequency(): String = ReminderScheduler.getFrequency(this@MainActivity)

        @JavascriptInterface
        fun requestFrequency(frequency: String) {
            runOnUiThread { applyReminderFrequency(frequency) }
        }
    }
}
