package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.core.http.ErrorBody
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeDetail
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeListItem
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.graph.SearchQuery
import io.ktor.http.HttpStatusCode
import io.ktor.openapi.jsonSchema
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.delete
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.openapi.describe
import io.ktor.utils.io.ExperimentalKtorApi
import org.koin.ktor.ext.inject

@OptIn(ExperimentalKtorApi::class)
fun Route.configureRecipeRouting() {
    val service: RecipeService by inject()

    get("/recipes") {
        call.respond(service.list(call.searchQuery()))
    }.describe {
        operationId = "listRecipes"
        tag("recipes")
        description = "List recipes. Repeat excludeIngredientId, excludeAllergenId, haveIngredientId, haveToolId, and dislikeIngredientId to filter."
        responses {
            HttpStatusCode.OK {
                description = "Recipe summaries"
                schema = jsonSchema<List<RecipeListItem>>()
            }
            HttpStatusCode.BadRequest { description = "Bad query"; schema = jsonSchema<ErrorBody>() }
        }
    }

    post("/recipes") {
        val body = call.receive<RecipeWrite>()
        call.respond(HttpStatusCode.Created, service.create(body))
    }.describe {
        operationId = "createRecipe"
        tag("recipes")
        responses {
            HttpStatusCode.Created { description = "Created recipe"; schema = jsonSchema<RecipeDetail>() }
            HttpStatusCode.BadRequest { description = "Invalid recipe"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Conflict { description = "Unknown ingredient or tool"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/recipes/{id}") {
        val id = call.longParam("id")
        call.respond(service.get(id, call.searchQuery()))
    }.describe {
        operationId = "getRecipe"
        tag("recipes")
        description = "Recipe graph. The same exclusion query params as listRecipes fill avoidNodeIds."
        responses {
            HttpStatusCode.OK { description = "Recipe"; schema = jsonSchema<RecipeDetail>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }

    put("/recipes/{id}") {
        val id = call.longParam("id")
        val body = call.receive<RecipeWrite>()
        call.respond(service.update(id, body))
    }.describe {
        operationId = "updateRecipe"
        tag("recipes")
        responses {
            HttpStatusCode.OK { description = "Updated recipe"; schema = jsonSchema<RecipeDetail>() }
            HttpStatusCode.BadRequest { description = "Invalid recipe"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Conflict { description = "Unknown ingredient or tool"; schema = jsonSchema<ErrorBody>() }
        }
    }

    delete("/recipes/{id}") {
        val id = call.longParam("id")
        service.delete(id)
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteRecipe"
        tag("recipes")
        responses {
            HttpStatusCode.NoContent { description = "Deleted recipe" }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }
}

private fun ApplicationCall.longParam(name: String): Long =
    parameters[name]?.toLongOrNull()
        ?: throw ApiException(HttpStatusCode.BadRequest, listOf("$name must be an integer"))

private fun ApplicationCall.searchQuery(): SearchQuery {
    fun longs(name: String): Set<Long> =
        request.queryParameters.getAll(name).orEmpty().map { raw ->
            raw.toLongOrNull() ?: throw ApiException(HttpStatusCode.BadRequest, listOf("$name must be an integer"))
        }.toSet()
    return SearchQuery(
        excludeIngredientIds = longs("excludeIngredientId"),
        excludeAllergenIds = longs("excludeAllergenId"),
        haveIngredientIds = longs("haveIngredientId"),
        haveToolIds = longs("haveToolId"),
        dislikeIngredientIds = longs("dislikeIngredientId"),
    )
}
