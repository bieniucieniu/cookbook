package com.bieniucieniu.cookbook.features.mcp

import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.AuthConfig
import com.bieniucieniu.cookbook.features.auth.nowSeconds
import com.bieniucieniu.cookbook.workos.WorkOS
import com.bieniucieniu.cookbook.workos.sha256Hex
import io.ktor.client.HttpClient
import io.ktor.client.request.forms.submitForm
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import io.ktor.http.parameters
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull

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
        val intro = introspect(token) ?: return McpGate.Denied
        if (!intro.active || config.mcpResourceUrl !in intro.audiences) return McpGate.Denied
        val exp = intro.exp
        if (exp != null && exp <= nowSeconds()) return McpGate.Denied
        val sub = intro.subject ?: return McpGate.Denied
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

    private suspend fun introspect(token: String): Introspection? {
        val domain = config.authKitDomain ?: return null
        val clientId = config.clientId ?: return null
        val apiKey = config.apiKey ?: return null
        val response = try {
            http.submitForm(
                url = "$domain/oauth2/introspection",
                formParameters = parameters {
                    append("token", token)
                    append("client_id", clientId)
                    append("client_secret", apiKey)
                },
            )
        } catch (_: Throwable) {
            return null
        }
        if (!response.status.isSuccess()) return null
        val body = try {
            json.parseToJsonElement(response.bodyAsText()) as? JsonObject
        } catch (_: Throwable) {
            null
        } ?: return null
        val active = body["active"]?.jsonPrimitive?.contentOrNull == "true"
        return Introspection(
            active = active,
            subject = body["sub"]?.jsonPrimitive?.contentOrNull,
            audiences = audiences(body),
            exp = body["exp"]?.jsonPrimitive?.longOrNull,
        )
    }

    private fun audiences(body: JsonObject): Set<String> {
        val aud = body["aud"] ?: return emptySet()
        return when (aud) {
            is JsonArray -> aud.mapNotNull { element ->
                (element as? JsonPrimitive)?.contentOrNull
            }.toSet()
            is JsonPrimitive -> setOf(aud.content)
            else -> emptySet()
        }
    }

    private data class Cached(val actor: Actor, val exp: Long)

    private data class Introspection(
        val active: Boolean,
        val subject: String?,
        val audiences: Set<String>,
        val exp: Long?,
    )
}

internal fun resourceOrigin(resourceUrl: String): String {
    val scheme = resourceUrl.substringBefore("://")
    val rest = resourceUrl.substringAfter("://")
    val host = rest.substringBefore('/')
    return "$scheme://$host"
}

/** Path of the resource URL with a leading slash, or null when the resource sits at the origin root. */
internal fun resourcePath(resourceUrl: String): String? {
    val rest = resourceUrl.substringAfter("://")
    val path = rest.substringAfter('/', "").substringBefore('?').substringBefore('#').trimEnd('/')
    return if (path.isEmpty()) null else "/$path"
}

internal fun bearerToken(authorization: String?): String? {
    if (authorization == null) return null
    val prefix = "Bearer "
    if (!authorization.startsWith(prefix)) return null
    val token = authorization.removePrefix(prefix).trim()
    if (token.isEmpty()) return null
    return token
}
