package com.bieniucieniu.cookbook.features.catalog.domain

import kotlinx.serialization.Serializable

@Serializable
data class NamedWrite(val slug: String, val name: String)

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
