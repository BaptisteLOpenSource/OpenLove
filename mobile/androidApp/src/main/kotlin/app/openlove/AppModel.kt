package app.openlove

import app.openlove.chat.ChatModel
import app.openlove.core.api.ApiException
import app.openlove.core.api.HomeResponse
import app.openlove.core.api.OpenLoveClient
import app.openlove.core.api.ThemeResponse
import app.openlove.core.session.PairingLink
import app.openlove.core.theme.ThemeCache
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.IOException

sealed interface Screen {
    data object Loading : Screen

    data class Pairing(
        val error: PairingError? = null,
    ) : Screen

    data class Home(
        val home: HomeResponse,
    ) : Screen

    data class Chat(
        val home: Home,
        val chat: ChatModel,
    ) : Screen

    data object Unreachable : Screen
}

enum class PairingError { CodeExpired, BadCredentials, NotMember, RateLimited, InvalidLink, Unreachable }

class AppModel(
    private val client: OpenLoveClient,
    private val themeCache: ThemeCache,
    private val chatWake: ReceiveChannel<Unit> = Channel(Channel.CONFLATED),
    private val onHome: suspend () -> Unit = {},
) {
    private val _screen = MutableStateFlow<Screen>(Screen.Loading)
    val screen: StateFlow<Screen> = _screen

    private val _theme = MutableStateFlow(themeCache.read())
    val theme: StateFlow<ThemeResponse?> = _theme

    suspend fun start() {
        if (client.isPaired()) showHome() else _screen.value = Screen.Pairing()
    }

    // From the chat header the user stays in the chat; only its Accueil copy is refreshed.
    suspend fun setMood(mood: String) {
        if (_screen.value !is Screen.Chat) return showHome { client.setMood(mood) }
        try {
            val home = Screen.Home(client.setMood(mood))
            (_screen.value as? Screen.Chat)?.let { _screen.value = it.copy(home = home) }
        } catch (e: ApiException) {
            if (e.status == 401) _screen.value = Screen.Pairing()
        } catch (e: IOException) {
            // chat shows its own connection state
        }
    }

    private suspend fun showHome(load: suspend () -> HomeResponse = { client.home() }) {
        _screen.value =
            try {
                loadHome(load).also { onHome() }
            } catch (e: ApiException) {
                if (e.status == 401) Screen.Pairing() else Screen.Unreachable
            } catch (e: IOException) {
                Screen.Unreachable
            }
    }

    fun openChat() {
        (_screen.value as? Screen.Home)?.let {
            val chat = ChatModel(client, onSessionLost = { _screen.value = Screen.Pairing() }, wake = chatWake)
            _screen.value = Screen.Chat(it, chat)
        }
    }

    fun back() {
        (_screen.value as? Screen.Chat)?.let { _screen.value = it.home }
    }

    suspend fun pair(raw: String) {
        val link = PairingLink.parse(raw) ?: return fail(PairingError.InvalidLink)
        enter(codeStatus = 401) { client.pair(link) }
    }

    suspend fun signIn(
        instanceUrl: String,
        email: String,
        password: String,
    ) {
        val url = PairingLink.instanceUrl(instanceUrl) ?: return fail(PairingError.InvalidLink)
        enter(codeStatus = null) { client.signIn(url, email, password) }
    }

    private suspend fun enter(
        codeStatus: Int?,
        begin: suspend () -> Unit,
    ) {
        _screen.value = Screen.Loading
        try {
            begin()
        } catch (e: ApiException) {
            return fail(errorOf(e.status, codeStatus))
        } catch (e: IOException) {
            return fail(PairingError.Unreachable)
        }
        showHome()
    }

    private suspend fun loadHome(load: suspend () -> HomeResponse): Screen.Home {
        val home = Screen.Home(load())
        try {
            client.theme().let {
                themeCache.save(it)
                _theme.value = it
            }
        } catch (e: ApiException) {
            // theme is cosmetic: keep cached one
        } catch (e: IOException) {
            // same
        }
        return home
    }

    private fun fail(error: PairingError) {
        _screen.value = Screen.Pairing(error)
    }

    private fun errorOf(
        status: Int,
        codeStatus: Int?,
    ) = when (status) {
        codeStatus -> PairingError.CodeExpired
        400 -> if (codeStatus != null) PairingError.InvalidLink else PairingError.BadCredentials
        401 -> PairingError.BadCredentials
        403 -> PairingError.NotMember
        429 -> PairingError.RateLimited
        else -> PairingError.Unreachable
    }
}
