package com.bieniucieniu.cookbook.features.auth

import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopping
import kotlinx.coroutines.runBlocking
import org.koin.dsl.module
import org.koin.ktor.ext.get

val authModule = module {
    single { AuthConfig.fromEnv() }
    single { AuthRepository(get(), get()) }
    single<SessionReader> { SessionService(get()) }
    single { AuthService(get(), get(), AuthService.client(get())) }
}

fun Application.configureAuthShutdown() {
    monitor.subscribe(ApplicationStopping) {
        runBlocking { get<AuthService>().close() }
    }
}
