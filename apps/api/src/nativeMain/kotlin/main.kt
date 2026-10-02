package com.bieniucieniu.cookbook

import com.bieniucieniu.cookbook.app.configureKoin
import com.bieniucieniu.cookbook.app.configureRouting
import com.bieniucieniu.cookbook.core.database.configureDatabase
import com.bieniucieniu.cookbook.core.health.configureHealth
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.openapi.configureOpenApi
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer

fun main() {
    embeddedServer(CIO, port = 8080, host = "0.0.0.0") {
        configureKoin()
        configureSerialization()
        configureOpenApi()
        configureDatabase()
        configureHealth()
        configureRouting()
    }.start(wait = true)
}
