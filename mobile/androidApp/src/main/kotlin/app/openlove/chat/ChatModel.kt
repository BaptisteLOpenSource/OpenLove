package app.openlove.chat

import app.openlove.core.api.ApiException
import app.openlove.core.api.Message
import app.openlove.core.api.MessagesResponse
import app.openlove.core.api.OpenLoveClient
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException

data class ChatState(
    val items: List<Message> = emptyList(),
    val hasOlder: Boolean = false,
    val failed: Boolean = false,
    val me: String? = null,
    val partnerReadId: String? = null,
)

// Vu sits under the last own Message the other Partenaire has read
fun seenId(
    items: List<Message>,
    me: String?,
    partnerReadId: String?,
): String? {
    if (me == null || partnerReadId == null) return null
    val read = partnerReadId.toLong()
    return items
        .lastOrNull { it.authorId == me && it.id.toLong() <= read }
        ?.id
}

class ChatModel(
    private val client: OpenLoveClient,
    private val onSessionLost: () -> Unit = {},
    private val wake: ReceiveChannel<Unit> = Channel(Channel.CONFLATED),
) {
    private val _state = MutableStateFlow(ChatState())
    val state: StateFlow<ChatState> = _state

    private val lock = Mutex()
    private var olderCursor: String? = null
    private var loaded = false
    private var markedId: String? = null

    suspend fun poll() {
        while (true) {
            refresh()
            // a push wakes the poll early; the timeout keeps the 3 s cadence
            withTimeoutOrNull(POLL_MS) { wake.receive() }
        }
    }

    suspend fun refresh() =
        guarded {
            val page = client.messages()
            merge(page.items)
            _state.value = _state.value.copy(me = page.me, partnerReadId = page.partnerReadId)
            if (!loaded) {
                loaded = true
                setOlder(page)
            }
            markReadIfNew()
        }

    // POST only when the newest Message changed: poll runs every 3 s
    private suspend fun markReadIfNew() {
        val newest =
            _state.value.items
                .lastOrNull()
                ?.id ?: return
        if (newest == markedId) return
        client.markRead()
        markedId = newest
    }

    suspend fun loadOlder() =
        guarded {
            val cursor = olderCursor ?: return@guarded
            val page = client.messages(cursor)
            merge(page.items)
            setOlder(page)
        }

    suspend fun send(text: String) =
        guarded {
            merge(listOf(client.sendMessage(text)))
        }

    private suspend fun guarded(block: suspend () -> Unit) =
        lock.withLock {
            try {
                block()
                _state.value = _state.value.copy(failed = false)
            } catch (e: Exception) {
                if (!e.isRecoverable()) throw e
                if (e is ApiException && e.status == 401) onSessionLost()
                _state.value = _state.value.copy(failed = true)
            }
        }

    // Network, server envelope, DTO validation: the poll must survive them.
    private fun Exception.isRecoverable() = this is ApiException || this is IOException || this is IllegalArgumentException

    private fun setOlder(page: MessagesResponse) {
        olderCursor = page.nextCursor
        _state.value = _state.value.copy(hasOlder = page.nextCursor != null)
    }

    private fun merge(incoming: List<Message>) {
        val all = (_state.value.items + incoming).associateBy { it.id }.values
        _state.value = _state.value.copy(items = all.sortedBy { it.id.toLong() })
    }

    private companion object {
        const val POLL_MS = 3_000L
    }
}
