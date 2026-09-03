package com.bieniucieniu.cookbook

import com.workos.WorkOS
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.configureRecipes(
    repository: RecipeRepository,
    workos: WorkOS,
    clientId: String,
    cookieSecure: Boolean,
) {
    routing {
        get("/recipes") {
            call.requireUser(workos, clientId, cookieSecure) ?: return@get
            call.respond(repository.findAll())
        }
    }
}

fun Application.configureAuth(
    workos: WorkOS,
    clientId: String,
    cookieSecure: Boolean,
) {
    routing {
        authRoutes(workos, clientId, cookieSecure)
    }
}
