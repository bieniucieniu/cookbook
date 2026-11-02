package com.bieniucieniu.cookbook.features.mcp

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.catalog.CatalogRepository
import com.bieniucieniu.cookbook.features.catalog.domain.Allergen
import com.bieniucieniu.cookbook.features.catalog.domain.Ingredient
import com.bieniucieniu.cookbook.features.catalog.domain.NamedWrite
import com.bieniucieniu.cookbook.features.catalog.domain.Tool
import com.bieniucieniu.cookbook.features.recipes.RecipeService
import com.bieniucieniu.cookbook.features.recipes.domain.CommentResponse
import com.bieniucieniu.cookbook.features.recipes.domain.CommentWrite
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeDetail
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.graph.SearchQuery
import io.ktor.http.HttpStatusCode
import kotlinx.serialization.SerializationException
import kotlinx.serialization.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put

interface McpCatalog {
    suspend fun listAllergens(): List<Allergen>
    suspend fun listIngredients(): List<Ingredient>
    suspend fun listTools(): List<Tool>
    suspend fun createAllergen(slug: String, name: String): Allergen
    suspend fun createIngredient(slug: String, name: String): Ingredient
    suspend fun createTool(slug: String, name: String): Tool
}

interface McpRecipes {
    suspend fun get(actor: Actor, id: Long): RecipeDetail
    suspend fun create(actor: Actor, write: RecipeWrite): RecipeDetail
    suspend fun update(actor: Actor, id: Long, write: RecipeWrite): RecipeDetail
    suspend fun comment(actor: Actor, id: Long, write: CommentWrite): CommentResponse
}

class CatalogMcp(private val catalog: CatalogRepository) : McpCatalog {
    override suspend fun listAllergens(): List<Allergen> = catalog.listAllergens()
    override suspend fun listIngredients(): List<Ingredient> = catalog.listIngredients()
    override suspend fun listTools(): List<Tool> = catalog.listTools()
    override suspend fun createAllergen(slug: String, name: String): Allergen = catalog.createAllergen(slug, name)
    override suspend fun createIngredient(slug: String, name: String): Ingredient = catalog.createIngredient(slug, name)
    override suspend fun createTool(slug: String, name: String): Tool = catalog.createTool(slug, name)
}

class RecipeMcp(private val recipes: RecipeService) : McpRecipes {
    override suspend fun get(actor: Actor, id: Long): RecipeDetail = recipes.get(actor.userId, id, SearchQuery())
    override suspend fun create(actor: Actor, write: RecipeWrite): RecipeDetail = recipes.create(actor, write)
    override suspend fun update(actor: Actor, id: Long, write: RecipeWrite): RecipeDetail =
        recipes.update(actor, id, write)
    override suspend fun comment(actor: Actor, id: Long, write: CommentWrite): CommentResponse =
        recipes.comment(actor, id, write)
}

class McpTools(
    private val catalog: McpCatalog,
    private val recipes: McpRecipes,
) {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
    private val pretty = Json { prettyPrint = true; explicitNulls = false; encodeDefaults = true }
    private val slugPattern = Regex("[a-z0-9]+(-[a-z0-9]+)*")

    fun definitions(): JsonArray = buildJsonArray {
        add(toolDefinition(
            name = "list_ingredients",
            description = "List catalog ingredients (id, slug, name, allergenIds, alts).",
            schema = emptyInputSchema(),
            readOnly = true,
        ))
        add(toolDefinition(
            name = "list_tools",
            description = "List catalog tools (id, slug, name, alts).",
            schema = emptyInputSchema(),
            readOnly = true,
        ))
        add(toolDefinition(
            name = "list_allergens",
            description = "List catalog allergens (id, slug, name).",
            schema = emptyInputSchema(),
            readOnly = true,
        ))
        add(toolDefinition(
            name = "create_ingredient",
            description = "Create a catalog ingredient. slug is lowercase words joined by hyphens.",
            schema = namedInputSchema(),
        ))
        add(toolDefinition(
            name = "create_tool",
            description = "Create a catalog tool. slug is lowercase words joined by hyphens.",
            schema = namedInputSchema(),
        ))
        add(toolDefinition(
            name = "create_allergen",
            description = "Create a catalog allergen. slug is lowercase words joined by hyphens.",
            schema = namedInputSchema(),
        ))
        add(toolDefinition(
            name = "create_recipe",
            description = "Create a recipe. $RECIPE_HELP",
            schema = recipeInputSchema(includeRecipeId = false),
        ))
        add(toolDefinition(
            name = "get_recipe",
            description = "Fetch one recipe by id.",
            schema = recipeIdInputSchema(),
            readOnly = true,
        ))
        add(toolDefinition(
            name = "update_recipe",
            description = "Replace a recipe. Same fields as create_recipe, plus recipeId. $RECIPE_HELP",
            schema = recipeInputSchema(includeRecipeId = true),
            destructive = true,
            idempotent = true,
        ))
        add(toolDefinition(
            name = "add_step_comment",
            description = "Add a comment on a recipe step. stepKey is the node key. Posted as the signed-in user.",
            schema = commentInputSchema(),
        ))
    }

    suspend fun call(name: String, arguments: JsonObject, actor: Actor): JsonObject = try {
        when (name) {
            "list_ingredients" -> ok(catalog.listIngredients())
            "list_tools" -> ok(catalog.listTools())
            "list_allergens" -> ok(catalog.listAllergens())
            "create_ingredient" -> {
                val body = named(arguments)
                ok(catalog.createIngredient(body.slug, body.name))
            }
            "create_tool" -> {
                val body = named(arguments)
                ok(catalog.createTool(body.slug, body.name))
            }
            "create_allergen" -> {
                val body = named(arguments)
                ok(catalog.createAllergen(body.slug, body.name))
            }
            "create_recipe" -> ok(recipes.create(actor, json.decodeFromJsonElement(RecipeWrite.serializer(), arguments)))
            "get_recipe" -> ok(recipes.get(actor, requiredLong(arguments, "recipeId")))
            "update_recipe" -> ok(
                recipes.update(
                    actor,
                    requiredLong(arguments, "recipeId"),
                    json.decodeFromJsonElement(RecipeWrite.serializer(), arguments),
                ),
            )
            "add_step_comment" -> ok(
                recipes.comment(
                    actor,
                    requiredLong(arguments, "recipeId"),
                    json.decodeFromJsonElement(CommentWrite.serializer(), arguments),
                ),
            )
            else -> fail("unknown tool $name")
        }
    } catch (error: ApiException) {
        fail(error.message ?: "Request failed")
    } catch (error: SerializationException) {
        fail(error.message ?: "Invalid arguments")
    } catch (error: IllegalArgumentException) {
        fail(error.message ?: "Invalid arguments")
    }

    private fun named(arguments: JsonObject): NamedWrite {
        val body = json.decodeFromJsonElement(NamedWrite.serializer(), arguments)
        val errors = mutableListOf<String>()
        if (!slugPattern.matches(body.slug)) errors += "slug must match [a-z0-9]+(-[a-z0-9]+)*"
        if (body.name.isBlank()) errors += "name must not be blank"
        if (errors.isNotEmpty()) throw ApiException(HttpStatusCode.BadRequest, errors)
        return body
    }

    private fun requiredLong(arguments: JsonObject, name: String): Long =
        arguments[name]?.jsonPrimitive?.longOrNull
            ?: throw ApiException(HttpStatusCode.BadRequest, listOf("$name must be an integer"))

    private inline fun <reified T> ok(value: T): JsonObject =
        text(pretty.encodeToString(serializer(), value), error = false)

    private fun fail(message: String): JsonObject = text(message, error = true)

    private fun text(message: String, error: Boolean): JsonObject = buildJsonObject {
        put("content", buildJsonArray {
            add(buildJsonObject {
                put("type", "text")
                put("text", message)
            })
        })
        if (error) put("isError", true)
    }
}
