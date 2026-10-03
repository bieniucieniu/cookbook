package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.recipes.domain.Recipe
import io.ktor.http.HttpStatusCode
import io.ktor.openapi.jsonSchema
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.openapi.describe
import io.ktor.utils.io.ExperimentalKtorApi
import org.koin.ktor.ext.inject

@OptIn(ExperimentalKtorApi::class)
fun Route.configureRecipeRouting() {
    val repository: RecipeRepository by inject()
    get("/recipes") {
        call.respond(repository.findAll())
    }.describe {
        operationId = "listRecipes"
        tag("recipes")
        responses {
            HttpStatusCode.OK {
                description = "Recipe list"
                schema = jsonSchema<List<Recipe>>()
            }
        }
    }
}
