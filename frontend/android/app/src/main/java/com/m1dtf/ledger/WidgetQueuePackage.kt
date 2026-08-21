package com.m1dtf.ledger

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

// Exposes the widget's pending-entry queue to JS. The JS side calls
// WidgetQueue.drain() on foreground, parses each raw string with the app's
// natural-language parser, and saves the results as transactions.
class WidgetQueueModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetQueue"

    @ReactMethod
    fun drain(promise: Promise) {
        try {
            val items = PendingStore.drain(reactApplicationContext)
            val arr = Arguments.createArray()
            for (item in items) arr.pushString(item)
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("drain_failed", e)
        }
    }
}

class WidgetQueuePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(WidgetQueueModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
