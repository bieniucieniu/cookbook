package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.health.configureHealthRouting
import com.bieniucieniu.cookbook.core.openapi.configureOpenApiRouting
import com.bieniucieniu.cookbook.features.auth.configureAuthRouting
import com.bieniucieniu.cookbook.features.catalog.configureCatalogRouting
import com.bieniucieniu.cookbook.features.mcp.configureMcpRouting
import com.bieniucieniu.cookbook.features.mcp.configureMcpWellKnownRouting
import com.bieniucieniu.cookbook.features.photos.configurePhotoRouting
import com.bieniucieniu.cookbook.features.recipes.configureRecipeRouting
import io.ktor.server.application.Application
import io.ktor.server.routing.Route
import io.ktor.server.routing.route
import io.ktor.server.routing.routing

fun Application.configureRouting() {
    routing {
        // OAuth discovery for the MCP endpoint. RFC 8414 / RFC 9728 put these at the host root.
        configureMcpWellKnownRouting()
        route(ApiVersion.V1) { v1() }
    }
}

private fun Route.v1() {
    configureHealthRouting()
    configureOpenApiRouting()
    configureAuthRouting()
    configureMcpRouting()
    configureCatalogRouting()
    configurePhotoRouting()
    configureRecipeRouting()
}
