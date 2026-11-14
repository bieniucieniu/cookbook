package com.bieniucieniu.cookbook.features.mcp

import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.AuthConfig
import com.bieniucieniu.cookbook.features.auth.nowSeconds
import com.bieniucieniu.cookbook.workos.WorkOS
import com.bieniucieniu.cookbook.workos.sha256Hex
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.Url
import io.ktor.http.auth.AuthScheme
import io.ktor.http.auth.HttpAuthHeader
import io.ktor.http.auth.parseAuthorizationHeader
import io.ktor.http.isSuccess
import io.ktor.http.protocolWithAuthority
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

fun interface McpAccounts {
    suspend fun account(workosUserId: String, email: String, firstName: String, lastName: String): Actor
}

sealed interface McpGate {
    data class Ready(val actor: Actor) : McpGate
    data object Unconfigured : McpGate
    data object Denied : McpGate
}

class McpAuth(
    private val config: AuthConfig,
    private val http: HttpClient,
    private val workos: WorkOS?,
    private val accounts: McpAccounts,
) {
    private val cache = mutableMapOf<String, Cached>()
    private val mutex = Mutex()
    private val json = Json { ignoreUnknownKeys = true }
    private val verifier: AccessTokenVerifier? = config.authKitDomain?.let { domain ->
        AccessTokenVerifier(
            issuer = domain,
            resource = config.mcpResourceUrl,
            fetchJwks = { fetchJwks(domain) },
            now = ::nowSeconds,
        )
    }

    fun challenge(): String {
        val metadata = "${resourceOrigin(config.mcpResourceUrl)}/.well-known/oauth-protected-resource"
        return listOf(
            "Bearer error=\"unauthorized\"",
            "error_description=\"Authorization needed\"",
            "resource_metadata=\"$metadata\"",
        ).joinToString(", ")
    }

    fun protectedResource(): JsonObject = JsonObject(
        mapOf(
            "resource" to JsonPrimitive(config.mcpResourceUrl),
            "authorization_servers" to JsonArray(listOf(JsonPrimitive(config.authKitDomain.orEmpty()))),
            "bearer_methods_supported" to JsonArray(listOf(JsonPrimitive("header"))),
        ),
    )

    suspend fun authorizationServerMetadata(): String? {
        val domain = config.authKitDomain ?: return null
        val response = try {
            http.get("$domain/.well-known/oauth-authorization-server")
        } catch (_: Throwable) {
            return null
        }
        val text = response.bodyAsText()
        if (!response.status.isSuccess() || text.isBlank()) return null
        return text
    }

    suspend fun gate(authorization: String?): McpGate {
        if (!config.mcpConfigured || workos == null) return McpGate.Unconfigured
        val token = bearerToken(authorization) ?: return McpGate.Denied
        cached(token)?.let { return McpGate.Ready(it) }
        // AuthKit access tokens are RS256 JWTs. Verify them against the JWKS, not by introspection:
        // introspection needs a Connect application's credentials, not the environment API key.
        val claims = verifier?.verify(token) ?: return McpGate.Denied
        val exp = claims.expiresAt
        val sub = claims.subject
        val remote = try {
            workos.userManagement.get(sub)
        } catch (_: Throwable) {
            return McpGate.Denied
        }
        val actor = accounts.account(
            workosUserId = remote.id,
            email = remote.email,
            firstName = remote.firstName.orEmpty(),
            lastName = remote.lastName.orEmpty(),
        )
        remember(token, actor, exp ?: (nowSeconds() + 60))
        return McpGate.Ready(actor)
    }

    private suspend fun cached(token: String): Actor? {
        val now = nowSeconds()
        return mutex.withLock {
            val stale = cache.filterValues { it.exp <= now }.keys
            stale.forEach { cache.remove(it) }
            cache[sha256Hex(token)]?.actor
        }
    }

    private suspend fun remember(token: String, actor: Actor, exp: Long) {
        val now = nowSeconds()
        mutex.withLock {
            cache[sha256Hex(token)] = Cached(actor, exp)
            val stale = cache.filterValues { it.exp <= now }.keys
            stale.forEach { cache.remove(it) }
        }
    }

    private suspend fun fetchJwks(domain: String): JsonObject? = try {
        val response = http.get("${domain.trimEnd('/')}/oauth2/jwks")
        if (!response.status.isSuccess()) null
        else json.parseToJsonElement(response.bodyAsText()) as? JsonObject
    } catch (_: Throwable) {
        null
    }

    private data class Cached(val actor: Actor, val exp: Long)

}

internal fun resourceOrigin(resourceUrl: String): String = Url(resourceUrl).protocolWithAuthority

/** Path of the resource URL with a leading slash, or null when the resource sits at the origin root. */
internal fun resourcePath(resourceUrl: String): String? =
    Url(resourceUrl).encodedPath.trimEnd('/').ifEmpty { null }

internal fun bearerToken(authorization: String?): String? {
    if (authorization == null) return null
    val header = try {
        parseAuthorizationHeader(authorization)
    } catch (_: Exception) {
        return null
    }
    if (header !is HttpAuthHeader.Single || !header.authScheme.equals(AuthScheme.Bearer, ignoreCase = true)) return null
    return header.blob.ifBlank { null }
}
