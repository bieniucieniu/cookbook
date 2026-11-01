package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.lib.utils.randomBytes
import com.bieniucieniu.cookbook.workos.SecureBytes
import com.bieniucieniu.cookbook.workos.WorkOS
import io.ktor.client.HttpClient
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopping
import kotlinx.coroutines.runBlocking
import org.koin.dsl.module
import org.koin.ktor.ext.get

val authModule = module {
    single { AuthConfig.fromEnv() }
    single { AuthRepository(get(), get()) }
    single<SessionReader> { SessionService(get(), get<AuthConfig>().agentToken) }
    single {
        val config = get<AuthConfig>()
        val workos = if (!config.configured) {
            null
        } else {
            WorkOS(
                apiKey = config.apiKey,
                clientId = config.clientId,
                httpClient = get(),
                apiBaseUrl = config.apiBaseUrl,
                secureBytes = SecureBytes { randomBytes(it) },
            )
        }
        AuthService(get(), get(), workos)
    }
}

fun Application.configureHttpShutdown() {
    monitor.subscribe(ApplicationStopping) {
        runBlocking { get<HttpClient>().close() }
    }
}
