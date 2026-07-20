package com.ledger.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

// Schedules the daily "log your spending" reminder notifications. Alarms
// don't survive a reboot on their own, so BootReceiver calls
// rescheduleFromPrefs() to restore whatever the user last picked.
object ReminderScheduler {
    private const val PREFS = "reminder_prefs"
    private const val KEY_FREQUENCY = "frequency"

    private data class Slot(val requestCode: Int, val hour: Int, val minute: Int, val title: String, val body: String)

    private val SLOTS = mapOf(
        "once" to listOf(
            Slot(100, 20, 0, "Log today's spending", "Add any transactions from today before you forget.")
        ),
        "3x" to listOf(
            Slot(201, 9, 0, "Good morning ☀️", "Off to a fresh start — log anything from last night?"),
            Slot(202, 18, 30, "Dinner time reminder", "Quick check-in: add today's expenses so far."),
            Slot(203, 22, 0, "Before you sleep 🌙", "Last call to log today's transactions.")
        )
    )

    fun getFrequency(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_FREQUENCY, "off") ?: "off"

    fun schedule(context: Context, frequency: String) {
        cancelAll(context)
        SLOTS[frequency]?.forEach { slot -> scheduleSlot(context, slot) }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_FREQUENCY, frequency).apply()
    }

    fun rescheduleFromPrefs(context: Context) {
        val frequency = getFrequency(context)
        SLOTS[frequency]?.forEach { slot -> scheduleSlot(context, slot) }
    }

    private fun scheduleSlot(context: Context, slot: Slot) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val trigger = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, slot.hour)
            set(Calendar.MINUTE, slot.minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
            if (before(Calendar.getInstance())) add(Calendar.DAY_OF_YEAR, 1)
        }
        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            trigger.timeInMillis,
            AlarmManager.INTERVAL_DAY,
            pendingIntentFor(context, slot)
        )
    }

    private fun cancelAll(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        SLOTS.values.flatten().forEach { slot -> alarmManager.cancel(pendingIntentFor(context, slot)) }
    }

    private fun pendingIntentFor(context: Context, slot: Slot): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(ReminderReceiver.EXTRA_TITLE, slot.title)
            putExtra(ReminderReceiver.EXTRA_BODY, slot.body)
        }
        return PendingIntent.getBroadcast(
            context,
            slot.requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
