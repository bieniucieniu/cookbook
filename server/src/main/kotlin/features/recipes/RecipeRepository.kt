package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.recipes.domain.Recipe
import java.sql.ResultSet
import javax.sql.DataSource

class RecipeRepository(private val dataSource: DataSource) {
    fun findAll(): List<Recipe> =
        dataSource.connection.use { connection ->
            connection.prepareStatement("SELECT id, title FROM recipes ORDER BY id").use { statement ->
                statement.executeQuery().use { rows ->
                    buildList {
                        while (rows.next()) {
                            add(rows.toRecipe())
                        }
                    }
                }
            }
        }

    private fun ResultSet.toRecipe(): Recipe =
        Recipe(
            id = getLong("id"),
            title = getString("title"),
        )
}
