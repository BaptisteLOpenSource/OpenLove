package app.openlove.push

import android.content.Context
import app.openlove.core.api.OpenLoveClient
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

// Each Instance owns its Firebase project: FirebaseApp is built at runtime from /api/push-config.
class PushRegistrar(
    private val context: Context,
    private val client: OpenLoveClient,
) {
    suspend fun register() =
        quietly {
            if (FirebaseApp.getApps(context).isEmpty()) {
                val c = client.pushConfig()
                val options =
                    FirebaseOptions
                        .Builder()
                        .setProjectId(c.projectId)
                        .setApiKey(c.apiKey)
                        .setGcmSenderId(c.messagingSenderId)
                        .setApplicationId(c.androidAppId)
                        .build()
                FirebaseApp.initializeApp(context, options)
            }
            client.registerPushToken(fcmToken())
        }

    suspend fun onNewToken(token: String) = quietly { if (client.isPaired()) client.registerPushToken(token) }

    // push is optional (no Firebase config, token refused): never block the app
    private suspend fun quietly(block: suspend () -> Unit) {
        try {
            block()
        } catch (e: Exception) {
            if (e is CancellationException) throw e
        }
    }

    private suspend fun fcmToken(): String =
        suspendCancellableCoroutine { cont ->
            FirebaseMessaging.getInstance().token.addOnCompleteListener {
                if (it.isSuccessful) {
                    cont.resume(it.result)
                } else {
                    cont.resumeWithException(it.exception ?: IllegalStateException("no FCM token"))
                }
            }
        }
}
