package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.lib.utils.stringOrNull
import io.ktor.server.config.ApplicationConfig

data class WorkosConfig(
    val apiKey: String,
    val clientId: String,
    val cookieSecure: Boolean,
) {
    companion object {
        fun from(config: ApplicationConfig?): WorkosConfig {
            config ?: error("Missing workos config")
            val cookiePassword = config.stringOrNull("cookiePassword")
                ?: error("Missing workos.cookiePassword (WORKOS_COOKIE_PASSWORD)")
            require(cookiePassword.length >= 32) { "WORKOS_COOKIE_PASSWORD must be 32+ characters" }
            return WorkosConfig(
                apiKey = config.stringOrNull("apiKey")
                    ?: error("Missing workos.apiKey (WORKOS_API_KEY)"),
                clientId = config.stringOrNull("clientId")
                    ?: error("Missing workos.clientId (WORKOS_CLIENT_ID)"),
                cookieSecure = config.propertyOrNull("cookieSecure")?.getString()?.toBooleanStrictOrNull()
                    ?: false,
            )
        }
    }
}
