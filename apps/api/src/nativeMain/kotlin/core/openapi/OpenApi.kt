package com.bieniucieniu.cookbook.core.openapi

import io.ktor.openapi.OpenApiDoc
import io.ktor.openapi.OpenApiInfo
import io.ktor.openapi.Server
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.openapi.hide
import io.ktor.server.routing.openapi.plus
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingNode
import io.ktor.utils.io.ExperimentalKtorApi

@OptIn(ExperimentalKtorApi::class)
/**
 * Serves the OpenAPI document for the version route it is mounted in. Only that version's
 * routes are listed, so each API version has its own document and generated client.
 */
fun Route.configureOpenApiRouting(version: String = "1.0.0") {
    val versionRoot = this as RoutingNode
    get("/swagger/documentation.json") {
        val doc = OpenApiDoc(
            info = OpenApiInfo(title = "Cookbook API", version = version),
            servers = listOf(Server(url = "/")),
        ) + versionRoot.descendants()
        call.respond(doc)
    }.hide()
}
