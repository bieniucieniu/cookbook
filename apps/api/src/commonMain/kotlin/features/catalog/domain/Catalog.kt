package com.bieniucieniu.cookbook.features.catalog.domain

import com.bieniucieniu.cookbook.core.http.ApiException
import io.ktor.http.HttpStatusCode
import kotlinx.serialization.Serializable

@Serializable
data class NamedWrite(val slug: String, val name: String) {
    /** Throws 400 with every rule the slug and name break. Shared by the REST routes and the MCP tools. */
    fun validate() {
        val errors = mutableListOf<String>()
        if (!slugPattern.matches(slug)) errors += "slug must match [a-z0-9]+(-[a-z0-9]+)*"
        if (name.isBlank()) errors += "name must not be blank"
        if (errors.isNotEmpty()) throw ApiException(HttpStatusCode.BadRequest, errors)
    }
}

private val slugPattern = Regex("[a-z0-9]+(-[a-z0-9]+)*")

@Serializable
data class Allergen(val id: Long = 0, val slug: String, val name: String)

@Serializable
data class IngredientAlt(
    val altIngredientId: Long,
    val ratio: Double = 1.0,
    val note: String = "",
)

@Serializable
data class Ingredient(
    val id: Long = 0,
    val slug: String,
    val name: String,
    val allergenIds: List<Long> = emptyList(),
    val alts: List<IngredientAlt> = emptyList(),
)

@Serializable
data class AllergenSet(val allergenIds: List<Long>)

@Serializable
data class IngredientAltSet(val alts: List<IngredientAlt>)

@Serializable
data class ToolAlt(
    val altToolId: Long,
    val note: String = "",
)

@Serializable
data class Tool(
    val id: Long = 0,
    val slug: String,
    val name: String,
    val alts: List<ToolAlt> = emptyList(),
)

@Serializable
data class ToolAltSet(val alts: List<ToolAlt>)
