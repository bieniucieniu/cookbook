package com.bieniucieniu.cookbook.core.openapi

import io.ktor.openapi.OpenApiDoc
import io.ktor.openapi.OpenApiInfo
import io.ktor.openapi.Server
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.openapi.hide
import io.ktor.server.routing.openapi.plus
import io.ktor.server.routing.routing
import io.ktor.server.routing.routingRoot
import io.ktor.utils.io.ExperimentalKtorApi

@OptIn(ExperimentalKtorApi::class)
fun Application.configureOpenApi() {
    routing {
        get("/swagger/documentation.json") {
            val doc = OpenApiDoc(
                info = OpenApiInfo(title = "Cookbook API", version = "1.0.0"),
                servers = listOf(Server(url = "/")),
            ) + call.application.routingRoot.descendants()
            call.respond(doc)
        }.hide()
    }
}
