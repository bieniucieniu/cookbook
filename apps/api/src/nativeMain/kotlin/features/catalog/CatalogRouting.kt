package com.bieniucieniu.cookbook.features.catalog

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.core.http.ErrorBody
import com.bieniucieniu.cookbook.features.catalog.domain.Allergen
import com.bieniucieniu.cookbook.features.catalog.domain.AllergenSet
import com.bieniucieniu.cookbook.features.catalog.domain.Ingredient
import com.bieniucieniu.cookbook.features.catalog.domain.IngredientAltSet
import com.bieniucieniu.cookbook.features.catalog.domain.NamedWrite
import com.bieniucieniu.cookbook.features.catalog.domain.Tool
import com.bieniucieniu.cookbook.features.catalog.domain.ToolAltSet
import io.ktor.http.HttpStatusCode
import io.ktor.openapi.jsonSchema
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

private val slugPattern = Regex("[a-z0-9]+(-[a-z0-9]+)*")

@OptIn(ExperimentalKtorApi::class)
fun Route.configureCatalogRouting() {
    val repository: CatalogRepository by inject()

    get("/allergens") {
        call.respond(repository.listAllergens())
    }.describe {
        operationId = "listAllergens"
        tag("allergens")
        responses {
            HttpStatusCode.OK {
                description = "Allergen dictionary"
                schema = jsonSchema<List<Allergen>>()
            }
        }
    }

    post("/allergens") {
        val body = call.receive<NamedWrite>()
        requireNamed(body)
        call.respond(HttpStatusCode.Created, repository.createAllergen(body.slug, body.name))
    }.describe {
        operationId = "createAllergen"
        tag("allergens")
        responses {
            HttpStatusCode.Created {
                description = "Created allergen"
                schema = jsonSchema<Allergen>()
            }
            HttpStatusCode.BadRequest { description = "Invalid allergen"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.Conflict { description = "Duplicate slug"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/allergens/{id}") {
        val id = call.longParam("id")
        call.respond(repository.allergen(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("allergen not found")))
    }.describe {
        operationId = "getAllergen"
        tag("allergens")
        responses {
            HttpStatusCode.OK { description = "Allergen"; schema = jsonSchema<Allergen>() }
            HttpStatusCode.NotFound { description = "Missing allergen"; schema = jsonSchema<ErrorBody>() }
        }
    }

    put("/allergens/{id}") {
        val id = call.longParam("id")
        val body = call.receive<NamedWrite>()
        requireNamed(body)
        if (!repository.updateAllergen(id, body.slug, body.name)) {
            throw ApiException(HttpStatusCode.NotFound, listOf("allergen not found"))
        }
        call.respond(Allergen(id, body.slug, body.name))
    }.describe {
        operationId = "updateAllergen"
        tag("allergens")
        responses {
            HttpStatusCode.OK { description = "Updated allergen"; schema = jsonSchema<Allergen>() }
        }
    }

    delete("/allergens/{id}") {
        val id = call.longParam("id")
        if (!repository.deleteAllergen(id)) throw ApiException(HttpStatusCode.NotFound, listOf("allergen not found"))
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteAllergen"
        tag("allergens")
        responses {
            HttpStatusCode.NoContent { description = "Deleted allergen" }
        }
    }

    get("/ingredients") {
        call.respond(repository.listIngredients())
    }.describe {
        operationId = "listIngredients"
        tag("ingredients")
        responses {
            HttpStatusCode.OK { description = "Ingredient dictionary"; schema = jsonSchema<List<Ingredient>>() }
        }
    }

    post("/ingredients") {
        val body = call.receive<NamedWrite>()
        requireNamed(body)
        call.respond(HttpStatusCode.Created, repository.createIngredient(body.slug, body.name))
    }.describe {
        operationId = "createIngredient"
        tag("ingredients")
        responses {
            HttpStatusCode.Created { description = "Created ingredient"; schema = jsonSchema<Ingredient>() }
        }
    }

    get("/ingredients/{id}") {
        val id = call.longParam("id")
        call.respond(repository.ingredient(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("ingredient not found")))
    }.describe {
        operationId = "getIngredient"
        tag("ingredients")
        responses {
            HttpStatusCode.OK { description = "Ingredient"; schema = jsonSchema<Ingredient>() }
        }
    }

    put("/ingredients/{id}") {
        val id = call.longParam("id")
        val body = call.receive<NamedWrite>()
        requireNamed(body)
        if (!repository.updateIngredient(id, body.slug, body.name)) {
            throw ApiException(HttpStatusCode.NotFound, listOf("ingredient not found"))
        }
        call.respond(repository.ingredient(id)!!)
    }.describe {
        operationId = "updateIngredient"
        tag("ingredients")
        responses {
            HttpStatusCode.OK { description = "Updated ingredient"; schema = jsonSchema<Ingredient>() }
        }
    }

    delete("/ingredients/{id}") {
        val id = call.longParam("id")
        if (!repository.deleteIngredient(id)) throw ApiException(HttpStatusCode.NotFound, listOf("ingredient not found"))
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteIngredient"
        tag("ingredients")
        responses {
            HttpStatusCode.NoContent { description = "Deleted ingredient" }
        }
    }

    put("/ingredients/{id}/allergens") {
        val id = call.longParam("id")
        if (repository.ingredient(id) == null) throw ApiException(HttpStatusCode.NotFound, listOf("ingredient not found"))
        val body = call.receive<AllergenSet>()
        unknownIds("allergen", body.allergenIds.toSet(), repository.allergenIds())
        repository.replaceIngredientAllergens(id, body.allergenIds)
        call.respond(repository.ingredient(id)!!)
    }.describe {
        operationId = "replaceIngredientAllergens"
        tag("ingredients")
        responses {
            HttpStatusCode.OK { description = "Ingredient with replaced allergens"; schema = jsonSchema<Ingredient>() }
        }
    }

    put("/ingredients/{id}/alts") {
        val id = call.longParam("id")
        if (repository.ingredient(id) == null) throw ApiException(HttpStatusCode.NotFound, listOf("ingredient not found"))
        val body = call.receive<IngredientAltSet>()
        val errors = mutableListOf<String>()
        val pairs = body.alts.map { it.altIngredientId }
        if (pairs.size != pairs.toSet().size) errors += "alternative ingredients must be unique"
        for (alt in body.alts) {
            if (alt.altIngredientId == id) errors += "an ingredient cannot replace itself"
            if (alt.ratio <= 0.0) errors += "ratio must be > 0"
        }
        if (errors.isNotEmpty()) throw ApiException(HttpStatusCode.BadRequest, errors)
        unknownIds("ingredient", body.alts.map { it.altIngredientId }.toSet(), repository.ingredientIds())
        repository.replaceIngredientAlts(id, body.alts)
        call.respond(repository.ingredient(id)!!)
    }.describe {
        operationId = "replaceIngredientAlts"
        tag("ingredients")
        responses {
            HttpStatusCode.OK { description = "Ingredient with replaced alternatives"; schema = jsonSchema<Ingredient>() }
        }
    }

    get("/tools") {
        call.respond(repository.listTools())
    }.describe {
        operationId = "listTools"
        tag("tools")
        responses {
            HttpStatusCode.OK { description = "Tool dictionary"; schema = jsonSchema<List<Tool>>() }
        }
    }

    post("/tools") {
        val body = call.receive<NamedWrite>()
        requireNamed(body)
        call.respond(HttpStatusCode.Created, repository.createTool(body.slug, body.name))
    }.describe {
        operationId = "createTool"
        tag("tools")
        responses {
            HttpStatusCode.Created { description = "Created tool"; schema = jsonSchema<Tool>() }
        }
    }

    get("/tools/{id}") {
        val id = call.longParam("id")
        call.respond(repository.tool(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("tool not found")))
    }.describe {
        operationId = "getTool"
        tag("tools")
        responses {
            HttpStatusCode.OK { description = "Tool"; schema = jsonSchema<Tool>() }
        }
    }

    put("/tools/{id}") {
        val id = call.longParam("id")
        val body = call.receive<NamedWrite>()
        requireNamed(body)
        if (!repository.updateTool(id, body.slug, body.name)) {
            throw ApiException(HttpStatusCode.NotFound, listOf("tool not found"))
        }
        call.respond(repository.tool(id)!!)
    }.describe {
        operationId = "updateTool"
        tag("tools")
        responses {
            HttpStatusCode.OK { description = "Updated tool"; schema = jsonSchema<Tool>() }
        }
    }

    delete("/tools/{id}") {
        val id = call.longParam("id")
        if (!repository.deleteTool(id)) throw ApiException(HttpStatusCode.NotFound, listOf("tool not found"))
        call.respond(HttpStatusCode.NoContent)
    }.describe {
        operationId = "deleteTool"
        tag("tools")
        responses {
            HttpStatusCode.NoContent { description = "Deleted tool" }
        }
    }

    put("/tools/{id}/alts") {
        val id = call.longParam("id")
        if (repository.tool(id) == null) throw ApiException(HttpStatusCode.NotFound, listOf("tool not found"))
        val body = call.receive<ToolAltSet>()
        val ids = body.alts.map { it.altToolId }
        if (ids.size != ids.toSet().size) throw ApiException(HttpStatusCode.BadRequest, listOf("alternative tools must be unique"))
        if (body.alts.any { it.altToolId == id }) {
            throw ApiException(HttpStatusCode.BadRequest, listOf("a tool cannot replace itself"))
        }
        unknownIds("tool", ids.toSet(), repository.toolIds())
        repository.replaceToolAlts(id, body.alts)
        call.respond(repository.tool(id)!!)
    }.describe {
        operationId = "replaceToolAlts"
        tag("tools")
        responses {
            HttpStatusCode.OK { description = "Tool with replaced alternatives"; schema = jsonSchema<Tool>() }
        }
    }
}

private fun requireNamed(body: NamedWrite) {
    val errors = mutableListOf<String>()
    if (!slugPattern.matches(body.slug)) errors += "slug must match [a-z0-9]+(-[a-z0-9]+)*"
    if (body.name.isBlank()) errors += "name must not be blank"
    if (errors.isNotEmpty()) throw ApiException(HttpStatusCode.BadRequest, errors)
}

private fun io.ktor.server.application.ApplicationCall.longParam(name: String): Long =
    parameters[name]?.toLongOrNull()
        ?: throw ApiException(HttpStatusCode.BadRequest, listOf("$name must be an integer"))
