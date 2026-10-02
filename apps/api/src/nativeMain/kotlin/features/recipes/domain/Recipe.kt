package com.bieniucieniu.cookbook.features.recipes.domain

import kotlinx.serialization.Serializable

@Serializable
data class Recipe(
    val id: Long = 0,
    val title: String,
)
