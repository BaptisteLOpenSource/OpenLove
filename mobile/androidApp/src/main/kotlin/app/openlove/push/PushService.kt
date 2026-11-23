package app.openlove.push

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import app.openlove.MainActivity
import app.openlove.OpenLoveApp
import app.openlove.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.launch

private const val CHAT = "chat"

fun createChatChannel(context: Context) {
    val channel = NotificationChannel(CHAT, context.getString(R.string.push_channel_chat), NotificationManager.IMPORTANCE_DEFAULT)
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
}

class PushService : FirebaseMessagingService() {
    private val container get() = (application as OpenLoveApp).container

    override fun onNewToken(token: String) {
        container.scope.launch { container.push.onNewToken(token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val tag = message.data["tag"]
        if (tag == CHAT) container.chatWake.trySend(Unit)
        if (container.foreground) return
        val open =
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
        // Data-only push: we build the notification; same tag replaces the previous one.
        val notification =
            Notification
                .Builder(this, CHAT)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle(message.data["title"] ?: getString(R.string.push_chat_title))
                .setContentText(message.data["body"] ?: getString(R.string.push_chat_text))
                .setContentIntent(open)
                .setAutoCancel(true)
                .build()
        getSystemService(NotificationManager::class.java).notify(tag ?: CHAT, 0, notification)
    }
}
