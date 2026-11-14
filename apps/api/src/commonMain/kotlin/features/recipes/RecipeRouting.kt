package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.core.http.ErrorBody
import com.bieniucieniu.cookbook.features.auth.SessionReader
import com.bieniucieniu.cookbook.features.recipes.domain.CommentResponse
import com.bieniucieniu.cookbook.features.recipes.domain.CommentWrite
import com.bieniucieniu.cookbook.features.recipes.domain.GrantWrite
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeDetail
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeGrant
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
    val sessions: SessionReader by inject()

    get("/recipes") {
        call.respond(service.list(sessions.actor(call)?.userId, call.searchQuery()))
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
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val body = call.receive<RecipeWrite>()
        call.respond(HttpStatusCode.Created, service.create(actor, body))
    }.describe {
        operationId = "createRecipe"
        tag("recipes")
        requestBody {
            required = true
            description = "Recipe"
            schema = jsonSchema<RecipeWrite>()
        }
        responses {
            HttpStatusCode.Created { description = "Created recipe"; schema = jsonSchema<RecipeDetail>() }
            HttpStatusCode.BadRequest { description = "Invalid recipe"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Conflict { description = "Unknown ingredient or tool"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/recipes/{id}") {
        val id = call.longParam("id")
        call.respond(service.get(sessions.actor(call)?.userId, id, call.searchQuery()))
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
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        val body = call.receive<RecipeWrite>()
        call.respond(service.update(actor, id, body))
    }.describe {
        operationId = "updateRecipe"
        tag("recipes")
        requestBody {
            required = true
            description = "Recipe"
            schema = jsonSchema<RecipeWrite>()
        }
        responses {
            HttpStatusCode.OK { description = "Updated recipe"; schema = jsonSchema<RecipeDetail>() }
            HttpStatusCode.BadRequest { description = "Invalid recipe"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Forbidden { description = "Not allowed"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Conflict { description = "Unknown ingredient or tool"; schema = jsonSchema<ErrorBody>() }
        }
    }

    delete("/recipes/{id}") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        service.delete(actor, id)
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteRecipe"
        tag("recipes")
        responses {
            HttpStatusCode.NoContent { description = "Deleted recipe" }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Forbidden { description = "Not allowed"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/recipes/{id}/grants") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        call.respond(service.grants(actor, id))
    }.describe {
        operationId = "listRecipeGrants"
        tag("recipes")
        responses {
            HttpStatusCode.OK { description = "Grants"; schema = jsonSchema<List<RecipeGrant>>() }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Forbidden { description = "Not the owner"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }

    put("/recipes/{id}/grants") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        val body = call.receive<GrantWrite>()
        call.respond(service.grant(actor, id, body))
    }.describe {
        operationId = "upsertRecipeGrant"
        tag("recipes")
        requestBody {
            required = true
            description = "Grant"
            schema = jsonSchema<GrantWrite>()
        }
        responses {
            HttpStatusCode.OK { description = "Grants"; schema = jsonSchema<List<RecipeGrant>>() }
            HttpStatusCode.BadRequest { description = "Invalid grant"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Forbidden { description = "Not the owner"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing user or recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }

    delete("/recipes/{id}/grants/{userId}") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        val userId = call.longParam("userId")
        service.revoke(actor, id, userId)
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteRecipeGrant"
        tag("recipes")
        responses {
            HttpStatusCode.NoContent { description = "Grant removed" }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Forbidden { description = "Not the owner"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }

    post("/recipes/{id}/comments") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        val body = call.receive<CommentWrite>()
        call.respond(HttpStatusCode.Created, service.comment(actor, id, body))
    }.describe {
        operationId = "createRecipeComment"
        tag("recipes")
        requestBody {
            required = true
            description = "Step comment"
            schema = jsonSchema<CommentWrite>()
        }
        responses {
            HttpStatusCode.Created { description = "Created comment"; schema = jsonSchema<CommentResponse>() }
            HttpStatusCode.BadRequest { description = "Invalid comment"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing recipe"; schema = jsonSchema<ErrorBody>() }
        }
    }

    delete("/recipes/{id}/comments/{commentId}") {
        val actor = sessions.actor(call) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val id = call.longParam("id")
        val commentId = call.longParam("commentId")
        service.deleteComment(actor, id, commentId)
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteRecipeComment"
        tag("recipes")
        responses {
            HttpStatusCode.NoContent { description = "Deleted comment" }
            HttpStatusCode.Unauthorized { description = "Login required"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Forbidden { description = "Not the author or owner"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.NotFound { description = "Missing comment"; schema = jsonSchema<ErrorBody>() }
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
