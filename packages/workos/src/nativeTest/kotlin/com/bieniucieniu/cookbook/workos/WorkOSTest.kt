package com.bieniucieniu.cookbook.workos

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class WorkOSTest {
    private val clients = mutableListOf<HttpClient>()

    @AfterTest
    fun closeClients() {
        clients.forEach { it.close() }
        clients.clear()
    }

    @Test
    fun pkceChallengeMatchesRfc7636() {
        assertEquals(
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
            pkceS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
        )
    }

    @Test
    fun authorizationUrlCarriesAuthKitAndPkce() {
        val workos = client { error("no http") }
        val issued = workos.userManagement.getAuthorizationUrlWithPKCE(
            AuthorizationUrlOptions(
                redirectUri = "http://localhost:3000/api/auth/callback",
                state = "state-1",
            ),
        )
        assertTrue(issued.url.startsWith("https://api.workos.com/user_management/authorize?"))
        assertTrue(issued.url.contains("provider=authkit"))
        assertTrue(issued.url.contains("state=state-1"))
        assertTrue(issued.url.contains("code_challenge=${issued.codeChallenge}"))
        assertTrue(issued.url.contains("code_challenge_method=S256"))
        assertEquals("state-1", issued.state)
        assertEquals(issued.codeChallenge, pkceS256(issued.codeVerifier))
        workos.close()
    }

    @Test
    fun ssoAuthorizationUrlNamesTheOrganization() {
        val workos = client { error("no http") }
        val url = workos.sso.getAuthorizationUrl(
            SsoAuthorizationUrlOptions(
                redirectUri = "http://localhost:3000/callback",
                organization = "org_1",
                state = "sso-state",
            ),
        )
        assertTrue(url.startsWith("https://api.workos.com/sso/authorize?"))
        assertTrue(url.contains("organization=org_1"))
        assertTrue(url.contains("state=sso-state"))
        workos.close()
    }

    @Test
    fun organizationMembershipCreatePostsThePair() = runBlocking {
        var path = ""
        var body = ""
        val workos = client { request ->
            path = request.url.encodedPath
            body = (request.body as TextContent).text
            respond(
                """{"id":"om_1","user_id":"user_1","organization_id":"org_1","status":"active","role":{"slug":"member"}}""",
                HttpStatusCode.OK,
                headersOf(HttpHeaders.ContentType to listOf("application/json")),
            )
        }
        val membership = workos.organizationMembership.create("user_1", "org_1", "member")
        assertEquals("/user_management/organization_memberships", path)
        assertTrue(body.contains("\"user_id\":\"user_1\""))
        assertTrue(body.contains("\"role_slug\":\"member\""))
        assertEquals("om_1", membership.id)
        workos.close()
    }

    @Test
    fun hmacSha256MatchesRfc4231() {
        val key = ByteArray(20) { 0x0b }
        assertEquals(
            "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
            hmacSha256(key, "Hi There".encodeToByteArray()).toHexString(),
        )
    }

    @Test
    fun webhookAcceptsAMatchingSignature() {
        val payload = """{"id":"event_1","event":"user.created"}"""
        val secret = "whsec"
        val timestamp = 1_700_000_000L
        val signature = hmacSha256Hex(secret, "$timestamp.$payload")
        val event = Webhook().constructEvent(
            payload = payload,
            signatureHeader = "t=$timestamp, v1=$signature",
            secret = secret,
            nowSeconds = timestamp,
        )
        assertEquals("event_1", event.getValue("id").jsonPrimitive.content)
    }

    @Test
    fun webhookRejectsABadSignature() {
        assertFailsWith<SignatureVerificationException> {
            Webhook().constructEvent("{}", "t=1, v1=00", "secret", nowSeconds = 1)
        }
    }

    @Test
    fun authenticateWithCodePostsGrant() = runBlocking {
        var body = ""
        var authorization = ""
        val workos = client { request ->
            body = (request.body as TextContent).text
            authorization = request.headers[HttpHeaders.Authorization].orEmpty()
            respond(
                """{"user":{"id":"user_1","email":"a@b.c","first_name":"Ada","last_name":"Lovelace","email_verified":true},"access_token":"header.${payload()}.sig","refresh_token":"refresh"}""",
                HttpStatusCode.OK,
                headersOf(HttpHeaders.ContentType to listOf("application/json")),
            )
        }
        val result = workos.userManagement.authenticateWithCode(code = "code-1", codeVerifier = "verifier-1")
        assertTrue(body.contains("\"grant_type\":\"authorization_code\""))
        assertTrue(body.contains("\"code\":\"code-1\""))
        assertTrue(body.contains("\"code_verifier\":\"verifier-1\""))
        assertTrue(body.contains("\"client_id\":\"client_test\""))
        assertEquals("Bearer sk_test", authorization)
        assertEquals("a@b.c", result.user.email)
        assertEquals("session_1", sessionIdFromAccessToken(result.accessToken))
        workos.close()
    }

    @Test
    fun unauthorizedBecomesTypedException() = runBlocking {
        val workos = client {
            respond(
                """{"message":"bad key","code":"invalid_api_key"}""",
                HttpStatusCode.Unauthorized,
                headersOf(
                    HttpHeaders.ContentType to listOf("application/json"),
                    "X-Request-ID" to listOf("req_1"),
                ),
            )
        }
        val error = assertFailsWith<UnauthorizedException> {
            workos.userManagement.get("user_1")
        }
        assertEquals("bad key", error.message)
        assertEquals("req_1", error.requestId)
        workos.close()
    }

    private fun client(
        handler: suspend io.ktor.client.engine.mock.MockRequestHandleScope.(io.ktor.client.request.HttpRequestData) -> io.ktor.client.request.HttpResponseData,
    ): WorkOS {
        val http = HttpClient(MockEngine(handler)) {
            install(ContentNegotiation) {
                json(Json {
                    ignoreUnknownKeys = true
                    explicitNulls = false
                })
            }
        }
        clients += http
        return WorkOS(
            apiKey = "sk_test",
            clientId = "client_test",
            httpClient = http,
            secureBytes = SecureBytes { size -> ByteArray(size) { 7 } },
        )
    }

    private fun payload(): String = base64Url("""{"sid":"session_1"}""".encodeToByteArray())
}
