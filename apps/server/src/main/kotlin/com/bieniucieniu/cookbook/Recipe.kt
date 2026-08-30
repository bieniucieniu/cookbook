package com.bieniucieniu.cookbook

import kotlinx.serialization.Serializable

@Serializable
data class Recipe(
    val id: Long = 0,
    val title: String,
)
