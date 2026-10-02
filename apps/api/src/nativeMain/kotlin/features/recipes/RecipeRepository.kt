package com.bieniucieniu.cookbook.features.recipes

import app.cash.sqldelight.async.coroutines.awaitAsList
import com.bieniucieniu.cookbook.db.CookbookDatabase
import com.bieniucieniu.cookbook.features.recipes.domain.Recipe

class RecipeRepository(private val database: CookbookDatabase) {
    suspend fun findAll(): List<Recipe> =
        database.recipesQueries.selectAll().awaitAsList().map { row ->
            Recipe(
                id = row.id,
                title = row.title,
            )
        }
}
