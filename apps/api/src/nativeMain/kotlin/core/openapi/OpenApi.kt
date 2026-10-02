package com.bieniucieniu.cookbook.core.openapi

import com.bieniucieniu.cookbook.lib.utils.fileExists
import com.bieniucieniu.cookbook.lib.utils.readText
import io.ktor.http.ContentType
import io.ktor.server.application.Application
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.configureOpenApi() {
    routing {
        get("/swagger/documentation.yaml") {
            call.respondText(readOpenApiSpec(), ContentType.parse("application/yaml"))
        }
    }
}

private fun readOpenApiSpec(): String {
    val candidates = listOf(
        "apps/api/src/main/resources/swagger/documentation.yaml",
        "src/main/resources/swagger/documentation.yaml",
    )
    val path = candidates.firstOrNull { fileExists(it) }
        ?: error("swagger/documentation.yaml missing. Tried: $candidates")
    return readText(path)
}
