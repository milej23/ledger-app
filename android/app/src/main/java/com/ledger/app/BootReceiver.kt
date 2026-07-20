package com.ledger.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Alarms set via AlarmManager are cleared on reboot, so re-arm whatever
// reminder frequency the user had picked last.
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            ReminderScheduler.rescheduleFromPrefs(context)
        }
    }
}
