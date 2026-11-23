package app.openlove.reveals

import app.openlove.core.api.ApiException
import app.openlove.core.api.OpenLoveClient
import app.openlove.core.api.Reveal
import app.openlove.core.api.RevealKind
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.io.IOException

data class RevealsState(
    val items: List<Reveal> = emptyList(),
    val me: String? = null,
    val failed: Boolean = false,
)

enum class CreateResult { Ok, Invalid, Failed }

class RevealsModel(
    private val client: OpenLoveClient,
    private val onSessionLost: () -> Unit = {},
) {
    private val _state = MutableStateFlow(RevealsState())
    val state: StateFlow<RevealsState> = _state

    suspend fun refresh() {
        try {
            val r = client.reveals()
            _state.value = RevealsState(r.items, r.me)
        } catch (e: Exception) {
            if (!fail(e)) throw e
            _state.value = _state.value.copy(failed = true)
        }
    }

    suspend fun create(
        kind: RevealKind,
        title: String,
        body: String,
        revealAt: String,
    ): CreateResult {
        try {
            client.createReveal(kind, title, body, revealAt)
        } catch (e: ApiException) {
            if (e.status == 401) onSessionLost()
            return if (e.status == 400) CreateResult.Invalid else CreateResult.Failed
        } catch (e: IOException) {
            return CreateResult.Failed
        }
        refresh()
        return CreateResult.Ok
    }

    private fun fail(e: Exception): Boolean {
        if (e is ApiException && e.status == 401) onSessionLost()
        return e is ApiException || e is IOException || e is IllegalArgumentException
    }
}
