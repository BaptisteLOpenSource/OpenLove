package app.openlove.chat

import app.openlove.core.api.OpenLoveClient
import app.openlove.core.api.Session
import app.openlove.core.api.createApiClient
import app.openlove.core.session.SessionStore
import app.openlove.core.session.StoredSession
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private class MemoryStore : SessionStore {
    // access token payload = {"sub":"me"}
    private var value: StoredSession? = StoredSession("https://x.test", Session("h.eyJzdWIiOiJtZSJ9.s", "r", 1))

    override suspend fun read() = value

    override suspend fun write(value: StoredSession?) {
        this.value = value
    }
}

private fun msg(
    id: String,
    author: String = "u",
) = """{"id":"$id","authorId":"$author","body":"b$id","createdAt":"2026-11-18T10:00:00.000Z"}"""

class ChatModelTest {
    private val requests = Channel<String>(Channel.UNLIMITED)
    private val pages = HashMap<String, String>()
    private var sent = msg("11")

    private fun model(): ChatModel {
        val engine =
            MockEngine {
                val query = it.url.encodedQuery.let { q -> if (q.isEmpty()) "" else "?$q" }
                val key = "${it.method.value} ${it.url.encodedPath}$query"
                if (it.method == HttpMethod.Get) requests.send(key)
                val data =
                    when {
                        it.url.encodedPath == "/api/messages/read" -> """{"lastReadId":null}"""
                        it.method == HttpMethod.Post -> sent
                        else -> pages.getValue(key)
                    }
                respond("""{"data":$data}""", HttpStatusCode.OK, headersOf(HttpHeaders.ContentType, "application/json"))
            }
        return ChatModel(OpenLoveClient(MemoryStore(), createApiClient(engine)))
    }

    private fun ChatModel.ids() = state.value.items.map { it.id }

    private fun page(
        next: String?,
        vararg ids: String,
    ) = """{"items":[${ids.joinToString(",") { msg(it) }}],"nextCursor":${next?.let { "\"$it\"" }},"partnerReadId":null,"me":"me"}"""

    @Test
    fun seenIsLastOwnMessageReadByPartner() =
        runTest {
            pages["GET /api/messages"] =
                """{"items":[${msg("9", "me")},${msg("10")},${msg("11", "me")}],"nextCursor":null,"partnerReadId":"10","me":"me"}"""
            val chat = model()
            chat.refresh()
            val s = chat.state.value
            assertEquals("9", seenId(s.items, s.me, s.partnerReadId))
        }

    @Test
    fun pollsEvery3SecondsUntilCancelled() =
        runTest {
            pages["GET /api/messages"] = page(null, "1")
            val chat = model()
            val job = launch { chat.poll() }
            requests.receive()
            assertEquals(0L, testScheduler.currentTime)
            requests.receive()
            assertEquals(3_000L, testScheduler.currentTime)
            requests.receive()
            assertEquals(6_000L, testScheduler.currentTime)
            job.cancelAndJoin()
            advanceTimeBy(10_000)
            assertTrue(requests.tryReceive().isFailure)
        }

    @Test
    fun loadOlderUsesCursorAndSortsNumerically() =
        runTest {
            pages["GET /api/messages"] = page("9", "10")
            pages["GET /api/messages?cursor=9"] = page(null, "8", "9")
            val chat = model()
            chat.refresh()
            assertTrue(chat.state.value.hasOlder)
            chat.loadOlder()
            assertEquals(listOf("8", "9", "10"), chat.ids())
            assertFalse(chat.state.value.hasOlder)
        }

    @Test
    fun sendMergesOnceEvenWhenNextPollReturnsIt() =
        runTest {
            pages["GET /api/messages"] = page(null, "10", "11")
            val chat = model()
            chat.send("b11")
            assertEquals(listOf("11"), chat.ids())
            chat.refresh()
            assertEquals(listOf("10", "11"), chat.ids())
        }
}
