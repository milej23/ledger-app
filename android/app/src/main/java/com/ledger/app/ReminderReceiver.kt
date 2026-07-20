package com.ledger.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat

// Fires when a reminder alarm set by ReminderScheduler goes off and posts
// the actual notification tapping into MainActivity.
class ReminderReceiver : BroadcastReceiver() {
    companion object {
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        private const val CHANNEL_ID = "reminders"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Spending reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Daily nudges to log your transactions"
            }
        )

        val openApp = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(intent.getStringExtra(EXTRA_TITLE) ?: "Ledger")
            .setContentText(intent.getStringExtra(EXTRA_BODY) ?: "Don't forget to log today's spending.")
            .setAutoCancel(true)
            .setContentIntent(openApp)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        val notificationId = (intent.getStringExtra(EXTRA_TITLE) ?: CHANNEL_ID).hashCode()
        manager.notify(notificationId, notification)
    }
}
