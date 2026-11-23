package app.openlove

import android.content.Context
import app.openlove.core.api.OpenLoveClient
import app.openlove.core.session.EncryptedSessionStore
import app.openlove.core.session.keystoreAead
import app.openlove.core.theme.ThemeCache
import app.openlove.core.theme.Tokens
import app.openlove.push.PushRegistrar
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import java.io.File

class AppContainer(
    context: Context,
) {
    val themeCache = ThemeCache(File(context.filesDir, "theme.json"))

    val client by lazy { OpenLoveClient(EncryptedSessionStore(File(context.filesDir, "session.enc"), keystoreAead(context))) }

    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // A chat push wakes the open chat's poll.
    val chatWake = Channel<Unit>(Channel.CONFLATED)

    @Volatile
    var foreground = false

    val push by lazy { PushRegistrar(context, client) }

    val model by lazy { AppModel(client, themeCache, chatWake, onHome = { scope.launch { push.register() } }) }

    val tokens: Tokens by lazy {
        context.assets.open("tokens.json").use { Tokens.decode(it.reader().readText()) }
    }
}
