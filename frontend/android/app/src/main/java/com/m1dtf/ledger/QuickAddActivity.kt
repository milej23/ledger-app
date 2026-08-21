package com.m1dtf.ledger

import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

// The actual "chatbox" — a small floating popup launched by tapping the
// home-screen widget. Captures raw text and hands it to PendingStore;
// the React Native app parses/categorizes it the next time it's opened.
//
// Uses a plain translucent full-screen Activity (see Theme.Ledger.QuickAdd)
// rather than an AppCompat Dialog theme — Dialog themes on this window manager
// path failed to ever receive input focus (ANR: "does not have a focused
// window"), since the bottom-docked bar layout (see activity_quick_add.xml)
// already positions itself via layout_gravity, no special window flags needed.
class QuickAddActivity : AppCompatActivity() {

    private lateinit var input: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quick_add)

        window.setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE or
                WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        )

        input = findViewById(R.id.quick_add_input)
        val sendBtn = findViewById<android.widget.ImageButton>(R.id.quick_add_send)

        input.requestFocus()
        input.setOnEditorActionListener { _, actionId, event ->
            val isEnter = event != null && event.keyCode == KeyEvent.KEYCODE_ENTER
            if (actionId == EditorInfo.IME_ACTION_SEND || isEnter) {
                submit()
                true
            } else {
                false
            }
        }
        sendBtn.setOnClickListener { submit() }
    }

    private fun submit() {
        val text = input.text.toString().trim()
        if (text.isEmpty()) {
            finish()
            return
        }
        if (!text.any { it.isDigit() }) {
            Toast.makeText(this, "No amount found — try \"lunch 45\"", Toast.LENGTH_SHORT).show()
            return
        }
        PendingStore.add(this, text)
        Toast.makeText(this, "Logged — syncs when you open Ledger", Toast.LENGTH_SHORT).show()
        finish()
    }
}
