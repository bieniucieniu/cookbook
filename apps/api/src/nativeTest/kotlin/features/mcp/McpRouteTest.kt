package com.bieniucieniu.cookbook.features.mcp

import com.bieniucieniu.cookbook.app.ApiVersion
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.http.configureStatusPages
import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.AuthConfig
import com.bieniucieniu.cookbook.features.auth.OptionalWorkOS
import com.bieniucieniu.cookbook.features.catalog.domain.Allergen
import com.bieniucieniu.cookbook.features.catalog.domain.Ingredient
import com.bieniucieniu.cookbook.features.catalog.domain.Tool
import com.bieniucieniu.cookbook.features.recipes.domain.CommentResponse
import com.bieniucieniu.cookbook.features.recipes.domain.CommentWrite
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeDetail
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.workos.SecureBytes
import com.bieniucieniu.cookbook.workos.WorkOS
import dev.whyoleg.cryptography.CryptographyProvider
import dev.whyoleg.cryptography.algorithms.RSA
import dev.whyoleg.cryptography.algorithms.SHA256
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin

class McpRouteTest {
    @Test
    fun missingTokenIsUnauthorized() = harness { _, _ ->
        val response = client.post("/api/v1/mcp") {
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","id":1,"method":"initialize"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
        val challenge = response.headers[HttpHeaders.WWWAuthenticate].orEmpty()
        assertTrue(challenge.contains("resource_metadata="))
        assertTrue(challenge.contains("http://127.0.0.1:8080/.well-known/oauth-protected-resource"))
    }

    @Test
    fun protectedResourceDocument() = harness { _, _ ->
        val response = client.get("/.well-known/oauth-protected-resource")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("http://127.0.0.1:8080/api/v1/mcp"))
        assertTrue(body.contains("https://authkit.example"))
        assertTrue(body.contains("header"))
    }

    @Test
    fun protectedResourceDocumentAtResourcePath() = harness { _, _ ->
        val response = client.get("/.well-known/oauth-protected-resource/api/v1/mcp")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("http://127.0.0.1:8080/api/v1/mcp"))
        assertTrue(body.contains("https://authkit.example"))
    }

    @Test
    fun resourcePathParsing() {
        assertEquals("/api/v1/mcp", resourcePath("https://cookbook.example/api/v1/mcp/"))
        assertEquals(null, resourcePath("https://cookbook.example"))
        assertEquals(null, resourcePath("https://cookbook.example/"))
    }

    @Test
    fun activeTokenListsTools()= harness { _, _ ->
        val headers = client.post("/api/v1/mcp") {
            header(HttpHeaders.Authorization, "Bearer ${tokens.good}")
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","id":1,"method":"initialize"}""")
        }
        assertEquals(HttpStatusCode.OK, headers.status)
        val initialized = headers.bodyAsText()
        assertTrue(initialized.contains("2025-03-26"))
        assertTrue(initialized.contains("cookbook"))

        val listed = client.post("/api/v1/mcp") {
            header(HttpHeaders.Authorization, "Bearer ${tokens.good}")
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","id":2,"method":"tools/list"}""")
        }
        assertEquals(HttpStatusCode.OK, listed.status)
        assertTrue(listed.bodyAsText().contains("create_recipe"))
    }

    @Test
    fun wrongAudienceIsUnauthorized() = harness { accounts, _ ->
        val response = client.post("/api/v1/mcp") {
            header(HttpHeaders.Authorization, "Bearer ${tokens.badAudience}")
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","id":1,"method":"ping"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
        assertEquals(null, accounts.workosUserId)
    }

    @Test
    fun expiredTokenIsUnauthorized() = harness { accounts, _ ->
        val response = client.post("/api/v1/mcp") {
            header(HttpHeaders.Authorization, "Bearer ${tokens.expired}")
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","id":1,"method":"ping"}""")
        }
        assertEquals(HttpStatusCode.Unauthorized, response.status)
        assertEquals(null, accounts.workosUserId)
    }

    @Test
    fun listAllergensUsesUpsertedUser() = harness { accounts, catalog ->
        val response = client.post("/api/v1/mcp") {
            header(HttpHeaders.Authorization, "Bearer ${tokens.good}")
            contentType(ContentType.Application.Json)
            setBody(
                """{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_allergens","arguments":{}}}""",
            )
        }
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertTrue(body.contains("milk"))
        assertEquals("user_01", accounts.workosUserId)
        assertEquals("ada@example.com", accounts.email)
        assertEquals(true, catalog.listed)
    }

    @Test
    fun notificationIsAccepted() = harness { _, _ ->
        val response = client.post("/api/v1/mcp") {
            header(HttpHeaders.Authorization, "Bearer ${tokens.good}")
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","method":"notifications/initialized"}""")
        }
        assertEquals(HttpStatusCode.Accepted, response.status)
        assertEquals("", response.bodyAsText())
    }

    @Test
    fun foreignOriginIsForbidden() = harness { _, _ ->
        val response = client.post("/api/v1/mcp") {
            header(HttpHeaders.Origin, "http://evil.example")
            header(HttpHeaders.Authorization, "Bearer ${tokens.good}")
            contentType(ContentType.Application.Json)
            setBody("""{"jsonrpc":"2.0","id":1,"method":"ping"}""")
        }
        assertEquals(HttpStatusCode.Forbidden, response.status)
    }

    private fun harness(
        block: suspend io.ktor.server.testing.ApplicationTestBuilder.(RecordingAccounts, RecordingCatalog) -> Unit,
    ) {
        val http = mockHttp()
        val accounts = RecordingAccounts()
        val catalog = RecordingCatalog()
        try {
            testApplication {
                application {
                    configureSerialization()
                    configureStatusPages()
                    val app = this
                    app.install(Koin) {
                        modules(module {
                            single { testConfig() }
                            single { http }
                            single<OptionalWorkOS> {
                                OptionalWorkOS(
                                    WorkOS(
                                        apiKey = "sk_test",
                                        clientId = "client_test",
                                        httpClient = http,
                                        apiBaseUrl = "https://api.workos.com",
                                        secureBytes = SecureBytes { ByteArray(it) },
                                    ),
                                )
                            }
                            single {
                                McpAuth(
                                    config = get(),
                                    http = get(),
                                    workos = get<OptionalWorkOS>().client,
                                    accounts = accounts,
                                )
                            }
                            single { McpTools(catalog, ThrowingRecipes()) }
                        })
                    }
                    routing {
                        configureMcpWellKnownRouting()
                        route(ApiVersion.V1) { configureMcpRouting() }
                    }
                }
                block(accounts, catalog)
            }
        } finally {
            http.close()
        }
    }
}

private fun testConfig() = AuthConfig(
    clientId = "client_test",
    apiKey = "sk_test",
    redirectUri = "http://localhost:3000/api/v1/auth/callback",
    logoutReturnTo = "http://localhost:3000/",
    apiBaseUrl = "https://api.workos.com",
    sessionTtlSeconds = 60,
    agentToken = null,
    authKitDomain = "https://authkit.example",
    mcpResourceUrl = "http://127.0.0.1:8080/api/v1/mcp",
)

private fun mockHttp(): HttpClient = HttpClient(MockEngine { request ->
    val path = request.url.encodedPath
    when {
        path.endsWith("/oauth2/jwks") -> respond(
            tokens.jwks,
            HttpStatusCode.OK,
            io.ktor.http.headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
        )
        path.endsWith("/user_management/users/user_01") && request.method == HttpMethod.Get -> respond(
            """{"id":"user_01","email":"ada@example.com","first_name":"Ada","last_name":"Lovelace"}""",
            HttpStatusCode.OK,
            io.ktor.http.headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
        )
        path.endsWith("/.well-known/oauth-authorization-server") -> respond(
            """{"issuer":"https://authkit.example"}""",
            HttpStatusCode.OK,
            io.ktor.http.headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
        )
        else -> error("unexpected ${request.method.value} ${request.url}")
    }
}) {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; explicitNulls = false })
    }
}

/** AuthKit stand-in: one RSA key, its JWKS, and tokens signed with it. */
private class Tokens(val jwks: String, val good: String, val badAudience: String, val expired: String)

@OptIn(ExperimentalEncodingApi::class)
private val tokens: Tokens by lazy {
    runBlocking {
        val pair = CryptographyProvider.Default.get(RSA.PKCS1).keyPairGenerator(digest = SHA256).generateKey()
        val b64 = { bytes: ByteArray -> Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT).encode(bytes) }
        val der = pair.publicKey.encodeToByteArray(RSA.PublicKey.Format.DER.PKCS1)
        val (n, e) = pkcs1Integers(der)
        val jwks = buildJsonObject {
            put("keys", buildJsonArray {
                add(buildJsonObject {
                    put("kty", "RSA"); put("use", "sig"); put("alg", "RS256"); put("kid", "test")
                    put("n", b64(n)); put("e", b64(e))
                })
            })
        }.toString()
        suspend fun sign(aud: String, exp: Long): String {
            val header = b64("""{"alg":"RS256","kid":"test","typ":"JWT"}""".encodeToByteArray())
            val payload = b64(
                buildJsonObject {
                    put("iss", "https://authkit.example"); put("aud", aud); put("sub", "user_01"); put("exp", exp)
                }.toString().encodeToByteArray(),
            )
            val signature = pair.privateKey.signatureGenerator().generateSignature("$header.$payload".encodeToByteArray())
            return "$header.$payload.${b64(signature)}"
        }
        Tokens(
            jwks = jwks,
            good = sign("http://127.0.0.1:8080/api/v1/mcp", 4_000_000_000),
            badAudience = sign("https://other.example/mcp", 4_000_000_000),
            expired = sign("http://127.0.0.1:8080/api/v1/mcp", 1_000),
        )
    }
}

private fun pkcs1Integers(der: ByteArray): Pair<ByteArray, ByteArray> {
    var at = 0
    fun length(): Int {
        val first = der[at++].toInt() and 0xFF
        if (first < 0x80) return first
        var value = 0
        repeat(first and 0x7F) { value = (value shl 8) or (der[at++].toInt() and 0xFF) }
        return value
    }
    at++
    length()
    fun integer(): ByteArray {
        at++
        val size = length()
        return der.copyOfRange(at, at + size).also { at += size }
    }
    return integer() to integer()
}

private class RecordingAccounts : McpAccounts {
    var workosUserId: String? = null
    var email: String? = null

    override suspend fun account(workosUserId: String, email: String, firstName: String, lastName: String): Actor {
        this.workosUserId = workosUserId
        this.email = email
        return Actor(9)
    }
}

private class RecordingCatalog : McpCatalog {
    var listed: Boolean = false

    override suspend fun listAllergens(): List<Allergen> {
        listed = true
        return listOf(Allergen(id = 3, slug = "milk", name = "Milk"))
    }

    override suspend fun listIngredients(): List<Ingredient> = error("unused")
    override suspend fun listTools(): List<Tool> = error("unused")
    override suspend fun createAllergen(slug: String, name: String): Allergen = error("unused")
    override suspend fun createIngredient(slug: String, name: String): Ingredient = error("unused")
    override suspend fun createTool(slug: String, name: String): Tool = error("unused")
}

private class ThrowingRecipes : McpRecipes {
    override suspend fun get(actor: Actor, id: Long): RecipeDetail = error("unused")
    override suspend fun create(actor: Actor, write: RecipeWrite): RecipeDetail = error("unused")
    override suspend fun update(actor: Actor, id: Long, write: RecipeWrite): RecipeDetail = error("unused")
    override suspend fun comment(actor: Actor, id: Long, write: CommentWrite): CommentResponse = error("unused")
}
