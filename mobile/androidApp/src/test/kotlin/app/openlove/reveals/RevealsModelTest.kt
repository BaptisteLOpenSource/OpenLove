package app.openlove.reveals

import app.openlove.core.api.OpenLoveClient
import app.openlove.core.api.RevealKind
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
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private class Store : SessionStore {
    private var value: StoredSession? = StoredSession("https://x.test", Session("a", "r", 1))

    override suspend fun read() = value

    override suspend fun write(value: StoredSession?) {
        this.value = value
    }
}

private const val ITEM =
    """{"id":"7","kind":"letter","authorId":"u","revealAt":"2026-12-24T08:00:00.000Z","locked":true,"title":null,"body":null}"""

class RevealsModelTest {
    private var postStatus = HttpStatusCode.OK

    private fun model() =
        RevealsModel(
            OpenLoveClient(
                Store(),
                createApiClient(
                    MockEngine {
                        val post = it.method == HttpMethod.Post
                        val status = if (post) postStatus else HttpStatusCode.OK
                        val body =
                            when {
                                !status.value.let { c -> c in 200..299 } -> """{"error":{"code":"validation_failed","message":"m"}}"""
                                post -> """{"data":$ITEM}"""
                                else -> """{"data":{"items":[$ITEM],"me":"u"}}"""
                            }
                        respond(body, status, headersOf(HttpHeaders.ContentType, "application/json"))
                    },
                ),
            ),
        )

    @Test
    fun refreshLoadsItems() =
        runTest {
            val m = model()
            m.refresh()
            assertEquals("7", m.state.value.items.single().id)
            assertEquals("u", m.state.value.me)
        }

    @Test
    fun createOkReloads() =
        runTest {
            val m = model()
            assertEquals(CreateResult.Ok, m.create(RevealKind.Letter, "t", "b", "2026-12-24T08:00:00.000Z"))
            assertEquals(1, m.state.value.items.size)
        }

    @Test
    fun create400IsInvalid() =
        runTest {
            postStatus = HttpStatusCode.BadRequest
            val m = model()
            assertEquals(CreateResult.Invalid, m.create(RevealKind.Letter, "t", "b", "2020-01-01T00:00:00.000Z"))
            assertTrue(m.state.value.items.isEmpty())
        }
}
