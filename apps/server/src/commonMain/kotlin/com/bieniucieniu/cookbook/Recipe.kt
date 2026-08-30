package com.bieniucieniu.cookbook

import io.github.smyrgeorge.sqlx4k.annotation.Id
import io.github.smyrgeorge.sqlx4k.annotation.Table
import kotlinx.serialization.Serializable

@Table("recipes")
@Serializable
data class Recipe(
    @Id(insert = false) val id: Long = 0,
    val title: String,
)
