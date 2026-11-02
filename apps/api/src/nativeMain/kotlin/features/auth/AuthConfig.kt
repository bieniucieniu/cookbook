package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.lib.utils.env

data class AuthConfig(
    val clientId: String?,
    val apiKey: String?,
    val redirectUri: String,
    val logoutReturnTo: String,
    val apiBaseUrl: String,
    val sessionTtlSeconds: Long,
    val agentToken: String?,
    val authKitDomain: String?,
    val mcpResourceUrl: String,
) {
    val configured: Boolean
        get() = !clientId.isNullOrBlank() && !apiKey.isNullOrBlank()

    val mcpConfigured: Boolean
        get() = configured && !authKitDomain.isNullOrBlank()

    companion object {
        fun fromEnv() = AuthConfig(
            clientId = env("WORKOS_CLIENT_ID"),
            apiKey = env("WORKOS_API_KEY"),
            redirectUri = env("WORKOS_REDIRECT_URI") ?: "http://localhost:3000/api/auth/callback",
            logoutReturnTo = env("WORKOS_LOGOUT_RETURN_TO") ?: "http://localhost:3000/",
            apiBaseUrl = env("WORKOS_API_BASE_URL") ?: "https://api.workos.com",
            sessionTtlSeconds = env("SESSION_TTL_SECONDS")?.toLongOrNull() ?: 604800L,
            agentToken = env("AGENT_TOKEN"),
            authKitDomain = env("WORKOS_AUTHKIT_DOMAIN")?.trimEnd('/'),
            mcpResourceUrl = (env("MCP_RESOURCE_URL") ?: "http://127.0.0.1:8080/mcp").trimEnd('/'),
        )
    }
}
