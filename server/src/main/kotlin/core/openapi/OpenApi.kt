package com.bieniucieniu.cookbook.core.openapi

import io.ktor.http.ContentType
import io.ktor.server.application.Application
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.configureOpenApi() {
    routing {
        get("/swagger/documentation.yaml") {
            val yaml = environment.classLoader.getResource("swagger/documentation.yaml")
                ?.readText()
                ?: error("swagger/documentation.yaml missing")
            call.respondText(yaml, ContentType.parse("application/yaml"))
        }
    }
}
