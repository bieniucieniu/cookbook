package com.bieniucieniu.cookbook.workos

import io.ktor.client.engine.HttpClientEngine
import io.ktor.http.URLBuilder

/**
 * Native stand-in for the official `com.workos.WorkOS` client.
 * The official SDK is JVM, OkHttp, and generated from the full OpenAPI document.
 * This client takes a Ktor [HttpClientEngine] from the caller and keeps the same
 * service and method names for the AuthKit, organization, SSO, event, audit-log,
 * and webhook calls that fit Kotlin/Native. Methods are suspend. There is no
 * blocking twin and no `*Suspend` suffix.
 */
class WorkOS(
    val apiKey: String? = null,
    val clientId: String? = null,
    httpClientEngine: HttpClientEngine,
    val apiBaseUrl: String = "https://api.workos.com",
    private val secureBytes: SecureBytes,
) {
    init {
        if (apiKey.isNullOrBlank() && clientId.isNullOrBlank()) {
            throw IllegalArgumentException("WorkOS requires an apiKey or a clientId")
        }
    }

    internal val http = WorkOsHttp(apiBaseUrl, httpClientEngine, apiKey)

    val userManagement: UserManagement = UserManagement(this)
    val organizations: Organizations = Organizations(this)
    val organizationMembership: OrganizationMembershipService = OrganizationMembershipService(this)
    val sso: Sso = Sso(this)
    val events: Events = Events(this)
    val auditLogs: AuditLogs = AuditLogs(this)

    fun randomToken(bytes: Int = 32): String = base64Url(secureBytes.nextBytes(bytes))

    fun close() {
        http.close()
    }

    internal fun requireClientId(): String =
        clientId?.takeIf { it.isNotBlank() } ?: throw IllegalStateException("WorkOS clientId is required")

    internal fun requireApiKey(method: String) {
        if (apiKey.isNullOrBlank()) throw ApiKeyRequiredException(method)
    }

    internal fun browserUrl(path: String, query: Map<String, String?>): String =
        URLBuilder(apiBaseUrl.trimEnd('/') + path).apply {
            query.forEach { (name, value) ->
                if (!value.isNullOrEmpty()) parameters.append(name, value)
            }
        }.buildString()
}
