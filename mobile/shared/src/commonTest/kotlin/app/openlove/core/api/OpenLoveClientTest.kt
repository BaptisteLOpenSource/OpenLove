package app.openlove.core.api

import app.openlove.core.session.PairingLink
import app.openlove.core.session.SessionStore
import app.openlove.core.session.StoredSession
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

private class FakeSessionStore(
    var value: StoredSession? = null,
) : SessionStore {
    override suspend fun read() = value

    override suspend fun write(value: StoredSession?) {
        this.value = value
    }
}

private val json = headersOf(HttpHeaders.ContentType, "application/json")
private const val BASE = "https://x.test"
private val s1 = Session("a1", "r1", 100)
private val s2 = Session("a2", "r2", 200)
private const val SESSION2 = """{"data":{"accessToken":"a2","refreshToken":"r2","expiresAt":200}}"""
private const val HOME =
    """{"data":{"milestone":{"years":1,"months":2,"days":3,"totalDays":430},"upcomingDate":null,""" +
        """"mood":{"mine":null,"partner":null},"moodHistory":[]}}"""
private const val MESSAGE = """{"data":{"id":"7","authorId":"u","body":"Salut","createdAt":"2026-11-18T10:00:00.000Z"}}"""
private const val REVEAL =
    """{"id":"7","kind":"letter","authorId":"u","revealAt":"2026-12-24T08:00:00.000Z","locked":true,"title":null,"body":null}"""
private const val UNAUTHORIZED = """{"error":{"code":"unauthorized","message":"nope"}}"""

private fun MockRequestHandleScope.reply(
    status: HttpStatusCode,
    body: String,
): HttpResponseData = respond(body, status, json)

private fun client(
    store: SessionStore,
    handler: suspend MockRequestHandleScope.(HttpRequestData) -> HttpResponseData,
) = OpenLoveClient(store, createApiClient(MockEngine(handler)))

class OpenLoveClientTest {
    private val paired get() = FakeSessionStore(StoredSession(BASE, s1))

    @Test
    fun pairPostsCodeAndStoresSession() =
        runTest {
            val store = FakeSessionStore()
            var url = ""
            var body = ""
            val c =
                client(store) {
                    url = it.url.toString()
                    body = it.body.toByteArray().decodeToString()
                    reply(HttpStatusCode.OK, """{"data":{"accessToken":"a1","refreshToken":"r1","expiresAt":100}}""")
                }
            c.pair(PairingLink(BASE, "c0de"))
            assertEquals("$BASE/api/pairing", url)
            assertEquals("""{"code":"c0de"}""", body)
            assertEquals(StoredSession(BASE, s1), store.value)
        }

    @Test
    fun homeSendsBearerAndUnwrapsData() =
        runTest {
            var auth: String? = null
            val c =
                client(paired) {
                    auth = it.headers[HttpHeaders.Authorization]
                    reply(HttpStatusCode.OK, HOME)
                }
            val home = c.home()
            assertEquals("Bearer a1", auth)
            assertEquals(430, home.milestone.totalDays)
            assertNull(home.upcomingDate)
        }

    @Test
    fun home401RefreshesOnceAndRetries() =
        runTest {
            val store = paired
            val auths = mutableListOf<String?>()
            var refreshBody = ""
            val c =
                client(store) {
                    when (it.url.encodedPath) {
                        "/api/session/refresh" -> {
                            refreshBody = it.body.toByteArray().decodeToString()
                            reply(HttpStatusCode.OK, SESSION2)
                        }
                        else -> {
                            auths += it.headers[HttpHeaders.Authorization]
                            if (auths.size == 1) reply(HttpStatusCode.Unauthorized, UNAUTHORIZED) else reply(HttpStatusCode.OK, HOME)
                        }
                    }
                }
            c.home()
            assertEquals("""{"refreshToken":"r1"}""", refreshBody)
            assertEquals(listOf<String?>("Bearer a1", "Bearer a2"), auths)
            assertEquals(StoredSession(BASE, s2), store.value)
        }

    @Test
    fun parallel401sRefreshOnce() =
        runTest {
            val store = paired
            var refreshes = 0
            val gate = CompletableDeferred<Unit>()
            val arrived = Channel<Unit>(2)
            val c =
                client(store) {
                    if (it.url.encodedPath == "/api/session/refresh") {
                        refreshes++
                        reply(HttpStatusCode.OK, SESSION2)
                    } else if (it.headers[HttpHeaders.Authorization] == "Bearer a1") {
                        arrived.send(Unit)
                        gate.await()
                        reply(HttpStatusCode.Unauthorized, UNAUTHORIZED)
                    } else {
                        reply(HttpStatusCode.OK, HOME)
                    }
                }
            val calls = listOf(async { c.home() }, async { c.home() })
            arrived.receive()
            arrived.receive()
            gate.complete(Unit)
            calls.awaitAll()
            assertEquals(StoredSession(BASE, s2), store.value)
            assertEquals(1, refreshes)
        }

    @Test
    fun refresh401WipesSession() =
        runTest {
            val store = paired
            var refreshes = 0
            val c =
                client(store) {
                    if (it.url.encodedPath == "/api/session/refresh") refreshes++
                    reply(HttpStatusCode.Unauthorized, UNAUTHORIZED)
                }
            val e = assertFailsWith<ApiException> { c.home() }
            assertEquals(401, e.status)
            assertNull(store.read())
            assertEquals(1, refreshes)
        }

    @Test
    fun parallelCallsBothGet401WhenRefreshFails() =
        runTest {
            val gate = CompletableDeferred<Unit>()
            val arrived = Channel<Unit>(2)
            val c =
                client(paired) {
                    if (it.url.encodedPath != "/api/session/refresh") {
                        arrived.send(Unit)
                        gate.await()
                    }
                    reply(HttpStatusCode.Unauthorized, UNAUTHORIZED)
                }
            val calls = listOf(async { runCatching { c.home() } }, async { runCatching { c.home() } })
            arrived.receive()
            arrived.receive()
            gate.complete(Unit)
            calls.awaitAll().forEach {
                assertEquals(401, (it.exceptionOrNull() as ApiException).status)
            }
        }

    @Test
    fun sendMessagePostsTextWithBearer() =
        runTest {
            var auth: String? = null
            var body = ""
            val c =
                client(paired) {
                    auth = it.headers[HttpHeaders.Authorization]
                    body = it.body.toByteArray().decodeToString()
                    reply(HttpStatusCode.OK, MESSAGE)
                }
            assertEquals("7", c.sendMessage("Salut").id)
            assertEquals("Bearer a1", auth)
            assertEquals("""{"text":"Salut"}""", body)
        }

    @Test
    fun sendMessage401RefreshesAndRetriesPost() =
        runTest {
            val auths = mutableListOf<String?>()
            val c =
                client(paired) {
                    if (it.url.encodedPath == "/api/session/refresh") {
                        reply(HttpStatusCode.OK, SESSION2)
                    } else {
                        auths += it.headers[HttpHeaders.Authorization]
                        if (auths.size == 1) reply(HttpStatusCode.Unauthorized, UNAUTHORIZED) else reply(HttpStatusCode.OK, MESSAGE)
                    }
                }
            c.sendMessage("Salut")
            assertEquals(listOf<String?>("Bearer a1", "Bearer a2"), auths)
        }

    @Test
    fun revealsGetDecodesLockedItem() =
        runTest {
            val c = client(paired) { reply(HttpStatusCode.OK, """{"data":{"items":[$REVEAL],"me":"u"}}""") }
            val r = c.reveals()
            assertEquals(RevealKind.Letter, r.items.single().kind)
            assertEquals(true, r.items.single().locked)
            assertNull(r.items.single().title)
        }

    @Test
    fun createRevealPostsBodyAndSurfacesValidationError() =
        runTest {
            var body = ""
            val ok = client(paired) {
                body = it.body.toByteArray().decodeToString()
                reply(HttpStatusCode.OK, """{"data":$REVEAL}""")
            }
            ok.createReveal(RevealKind.Surprise, "T", "B", "2026-12-24T08:00:00.000Z")
            assertEquals("""{"kind":"surprise","title":"T","body":"B","revealAt":"2026-12-24T08:00:00.000Z"}""", body)
            val bad = client(paired) {
                reply(HttpStatusCode.BadRequest, """{"error":{"code":"validation_failed","message":"past"}}""")
            }
            val e = assertFailsWith<ApiException> { bad.createReveal(RevealKind.Letter, "T", "B", "2020-01-01T00:00:00.000Z") }
            assertEquals(400, e.status)
        }

    @Test
    fun messagesPassesCursor() =
        runTest {
            val urls = mutableListOf<String>()
            val c =
                client(paired) {
                    urls += it.url.toString()
                    reply(HttpStatusCode.OK, """{"data":{"items":[],"nextCursor":null,"partnerReadId":null,"me":"me"}}""")
                }
            c.messages()
            c.messages("42")
            assertEquals(listOf("$BASE/api/messages", "$BASE/api/messages?cursor=42"), urls)
        }

    @Test
    fun errorEnvelopeBecomesApiException() =
        runTest {
            val store = FakeSessionStore()
            val c =
                client(
                    store,
                ) { reply(HttpStatusCode.Unauthorized, """{"error":{"code":"unauthorized","message":"invalid pairing code"}}""") }
            val e = assertFailsWith<ApiException> { c.pair(PairingLink(BASE, "bad")) }
            assertEquals(401, e.status)
            assertEquals("unauthorized", e.code)
            assertEquals("invalid pairing code", e.message)
            assertNull(store.value)
        }

    @Test
    fun htmlErrorBecomesUnavailable() =
        runTest {
            val c =
                client(paired) {
                    respond("<html>bad gateway</html>", HttpStatusCode.BadGateway, headersOf(HttpHeaders.ContentType, "text/html"))
                }
            val e = assertFailsWith<ApiException> { c.home() }
            assertEquals(502, e.status)
            assertEquals("unavailable", e.code)
        }

    @Test
    fun pushConfigDecodes() =
        runTest {
            val c =
                client(paired) {
                    reply(
                        HttpStatusCode.OK,
                        """{"data":{"projectId":"p","apiKey":"k","messagingSenderId":"1","androidAppId":"1:1:android:a"}}""",
                    )
                }
            assertEquals(PushConfig("p", "k", "1", "1:1:android:a"), c.pushConfig())
        }

    @Test
    fun registerPushTokenPostsTokenAndPlatform() =
        runTest {
            var body = ""
            val c =
                client(paired) {
                    body = it.body.toByteArray().decodeToString()
                    reply(HttpStatusCode.OK, """{"data":{"registered":true}}""")
                }
            c.registerPushToken("tok")
            assertEquals("""{"token":"tok","platform":"android"}""", body)
        }

    @Test
    fun registerPushTokenForbiddenThrows() =
        runTest {
            val c = client(paired) { reply(HttpStatusCode.Forbidden, """{"error":{"code":"forbidden","message":"no"}}""") }
            assertEquals(403, assertFailsWith<ApiException> { c.registerPushToken("tok") }.status)
        }
}
