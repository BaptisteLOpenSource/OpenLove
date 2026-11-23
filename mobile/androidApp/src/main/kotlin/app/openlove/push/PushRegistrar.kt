package app.openlove.push

import android.content.Context
import app.openlove.core.api.OpenLoveClient
import app.openlove.core.api.PushConfig
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

// Each Instance owns its Firebase project: FirebaseApp is built at runtime from /api/push-config.
// The config is cached (public ids) so a cold process woken by FCM can init before Home loads.
fun initFirebaseFromCache(context: Context) {
    if (FirebaseApp.getApps(context).isNotEmpty()) return
    val p = context.getSharedPreferences("push_config", Context.MODE_PRIVATE)
    val projectId = p.getString("projectId", null) ?: return
    val apiKey = p.getString("apiKey", null) ?: return
    val senderId = p.getString("messagingSenderId", null) ?: return
    val appId = p.getString("androidAppId", null) ?: return
    initFirebase(context, PushConfig(projectId, apiKey, senderId, appId))
}

private fun initFirebase(
    context: Context,
    c: PushConfig,
) {
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

class PushRegistrar(
    private val context: Context,
    private val client: OpenLoveClient,
) {
    suspend fun register() =
        quietly {
            val c = client.pushConfig()
            context
                .getSharedPreferences("push_config", Context.MODE_PRIVATE)
                .edit()
                .putString("projectId", c.projectId)
                .putString("apiKey", c.apiKey)
                .putString("messagingSenderId", c.messagingSenderId)
                .putString("androidAppId", c.androidAppId)
                .apply()
            if (FirebaseApp.getApps(context).isEmpty()) initFirebase(context, c)
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
