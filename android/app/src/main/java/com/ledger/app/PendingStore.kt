package com.ledger.app

import android.content.Context
import org.json.JSONArray

// Native side of the widget bridge. The quick-add popup can't touch the
// WebView's localStorage directly, so it queues raw text here; MainActivity
// drains the queue into the page's parser the next time it's foregrounded.
object PendingStore {
    private const val PREFS = "widget_queue"
    private const val KEY = "pending_items"

    @Synchronized
    fun add(context: Context, text: String) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY, "[]"))
        arr.put(text)
        prefs.edit().putString(KEY, arr.toString()).apply()
    }

    @Synchronized
    fun drain(context: Context): List<String> {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = JSONArray(prefs.getString(KEY, "[]"))
        val out = mutableListOf<String>()
        for (i in 0 until arr.length()) out.add(arr.getString(i))
        prefs.edit().putString(KEY, "[]").apply()
        return out
    }
}
