package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.auth.requireUser
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import org.koin.ktor.ext.inject

fun Route.configureRecipeRouting() {
    val repository: RecipeRepository by inject()
    get("/recipes") {
        call.requireUser() ?: return@get
        call.respond(repository.findAll())
    }
}
