package com.bieniucieniu.cookbook.features.catalog

import app.cash.sqldelight.async.coroutines.awaitAsList
import app.cash.sqldelight.async.coroutines.awaitAsOneOrNull
import com.bieniucieniu.cookbook.core.database.sql
import com.bieniucieniu.cookbook.core.database.tx
import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.core.http.mapSql
import com.bieniucieniu.cookbook.db.CookbookDatabase
import com.bieniucieniu.cookbook.features.catalog.domain.Allergen
import com.bieniucieniu.cookbook.features.catalog.domain.Ingredient
import com.bieniucieniu.cookbook.features.catalog.domain.IngredientAlt
import com.bieniucieniu.cookbook.features.catalog.domain.Tool
import com.bieniucieniu.cookbook.features.catalog.domain.ToolAlt
import io.github.smyrgeorge.sqlx4k.impl.extensions.asLong
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.ktor.http.HttpStatusCode

class CatalogRepository(
    private val database: CookbookDatabase,
    private val postgres: IPostgresSQL,
) {
    suspend fun listAllergens(): List<Allergen> =
        database.allergensQueries.selectAllergens().awaitAsList().map { row ->
            Allergen(id = row.id, slug = row.slug, name = row.name)
        }

    suspend fun allergen(id: Long): Allergen? =
        database.allergensQueries.allergenById(id).awaitAsOneOrNull()?.let { row ->
            Allergen(id = row.id, slug = row.slug, name = row.name)
        }

    suspend fun createAllergen(slug: String, name: String): Allergen {
        val id = insertReturning(
            """
            INSERT INTO allergens (slug, name)
            VALUES (:slug, :name)
            RETURNING id
            """.trimIndent(),
            mapOf("slug" to slug, "name" to name),
        )
        return Allergen(id, slug, name)
    }

    suspend fun updateAllergen(id: Long, slug: String, name: String): Boolean {
        val updated = execute(
            "UPDATE allergens SET slug = :slug, name = :name WHERE id = :id",
            mapOf("id" to id, "slug" to slug, "name" to name),
        )
        return updated == 1L
    }

    suspend fun deleteAllergen(id: Long): Boolean {
        val deleted = execute("DELETE FROM allergens WHERE id = :id", mapOf("id" to id))
        return deleted == 1L
    }

    suspend fun listIngredients(): List<Ingredient> {
        val rows = database.ingredientsQueries.selectIngredients().awaitAsList()
        val allergens = allergensByIngredient()
        val alts = ingredientAltsByIngredient()
        return rows.map { row ->
            Ingredient(
                id = row.id,
                slug = row.slug,
                name = row.name,
                allergenIds = allergens[row.id].orEmpty(),
                alts = alts[row.id].orEmpty(),
            )
        }
    }

    suspend fun ingredient(id: Long): Ingredient? {
        val row = database.ingredientsQueries.ingredientById(id).awaitAsOneOrNull() ?: return null
        return Ingredient(
            id = row.id,
            slug = row.slug,
            name = row.name,
            allergenIds = allergensByIngredient()[row.id].orEmpty(),
            alts = ingredientAltsByIngredient()[row.id].orEmpty(),
        )
    }

    suspend fun createIngredient(slug: String, name: String): Ingredient {
        val id = insertReturning(
            """
            INSERT INTO ingredients (slug, name)
            VALUES (:slug, :name)
            RETURNING id
            """.trimIndent(),
            mapOf("slug" to slug, "name" to name),
        )
        return Ingredient(id, slug, name)
    }

    suspend fun updateIngredient(id: Long, slug: String, name: String): Boolean {
        val updated = execute(
            "UPDATE ingredients SET slug = :slug, name = :name WHERE id = :id",
            mapOf("id" to id, "slug" to slug, "name" to name),
        )
        return updated == 1L
    }

    suspend fun deleteIngredient(id: Long): Boolean {
        val deleted = execute("DELETE FROM ingredients WHERE id = :id", mapOf("id" to id))
        return deleted == 1L
    }

    suspend fun replaceIngredientAllergens(id: Long, allergenIds: List<Long>) {
        postgres.tx {
            execute(sql("DELETE FROM ingredient_allergens WHERE ingredient_id = :id", mapOf("id" to id))).getOrThrow()
            for (allergenId in allergenIds.distinct()) {
                execute(
                    sql(
                        """
                        INSERT INTO ingredient_allergens (ingredient_id, allergen_id)
                        VALUES (:ingredient_id, :allergen_id)
                        """.trimIndent(),
                        mapOf("ingredient_id" to id, "allergen_id" to allergenId),
                    ),
                ).getOrThrow()
            }
        }
    }

    suspend fun replaceIngredientAlts(id: Long, alts: List<IngredientAlt>) {
        postgres.tx {
            execute(sql("DELETE FROM ingredient_alts WHERE ingredient_id = :id", mapOf("id" to id))).getOrThrow()
            for (alt in alts) {
                execute(
                    sql(
                        """
                        INSERT INTO ingredient_alts (ingredient_id, alt_ingredient_id, ratio, note)
                        VALUES (:ingredient_id, :alt_ingredient_id, :ratio, :note)
                        """.trimIndent(),
                        mapOf(
                            "ingredient_id" to id,
                            "alt_ingredient_id" to alt.altIngredientId,
                            "ratio" to alt.ratio,
                            "note" to alt.note,
                        ),
                    ),
                ).getOrThrow()
            }
        }
    }

    suspend fun listTools(): List<Tool> {
        val rows = database.toolsQueries.selectTools().awaitAsList()
        val alts = toolAltsByTool()
        return rows.map { row ->
            Tool(id = row.id, slug = row.slug, name = row.name, alts = alts[row.id].orEmpty())
        }
    }

    suspend fun tool(id: Long): Tool? {
        val row = database.toolsQueries.toolById(id).awaitAsOneOrNull() ?: return null
        return Tool(id = row.id, slug = row.slug, name = row.name, alts = toolAltsByTool()[row.id].orEmpty())
    }

    suspend fun createTool(slug: String, name: String): Tool {
        val id = insertReturning(
            """
            INSERT INTO tools (slug, name)
            VALUES (:slug, :name)
            RETURNING id
            """.trimIndent(),
            mapOf("slug" to slug, "name" to name),
        )
        return Tool(id, slug, name)
    }

    suspend fun updateTool(id: Long, slug: String, name: String): Boolean {
        val updated = execute(
            "UPDATE tools SET slug = :slug, name = :name WHERE id = :id",
            mapOf("id" to id, "slug" to slug, "name" to name),
        )
        return updated == 1L
    }

    suspend fun deleteTool(id: Long): Boolean {
        val deleted = execute("DELETE FROM tools WHERE id = :id", mapOf("id" to id))
        return deleted == 1L
    }

    suspend fun replaceToolAlts(id: Long, alts: List<ToolAlt>) {
        postgres.tx {
            execute(sql("DELETE FROM tool_alts WHERE tool_id = :id", mapOf("id" to id))).getOrThrow()
            for (alt in alts) {
                execute(
                    sql(
                        """
                        INSERT INTO tool_alts (tool_id, alt_tool_id, note)
                        VALUES (:tool_id, :alt_tool_id, :note)
                        """.trimIndent(),
                        mapOf("tool_id" to id, "alt_tool_id" to alt.altToolId, "note" to alt.note),
                    ),
                ).getOrThrow()
            }
        }
    }

    suspend fun ingredientIds(): Set<Long> =
        database.ingredientsQueries.selectIngredientIds().awaitAsList().map { it }.toSet()

    suspend fun toolIds(): Set<Long> =
        database.toolsQueries.selectToolIds().awaitAsList().map { it }.toSet()

    suspend fun allergenIds(): Set<Long> =
        database.allergensQueries.selectAllergenIds().awaitAsList().map { it }.toSet()

    suspend fun allergensByIngredient(): Map<Long, List<Long>> =
        database.ingredientsQueries.selectIngredientAllergens().awaitAsList()
            .groupBy({ it.ingredient_id }, { it.allergen_id })

    private suspend fun ingredientAltsByIngredient(): Map<Long, List<IngredientAlt>> =
        database.ingredientsQueries.selectIngredientAlts().awaitAsList()
            .groupBy({ it.ingredient_id }) { row ->
                IngredientAlt(altIngredientId = row.alt_ingredient_id, ratio = row.ratio, note = row.note)
            }

    private suspend fun toolAltsByTool(): Map<Long, List<ToolAlt>> =
        database.toolsQueries.selectToolAlts().awaitAsList()
            .groupBy({ it.tool_id }) { row ->
                ToolAlt(altToolId = row.alt_tool_id, note = row.note)
            }

    private suspend fun insertReturning(text: String, args: Map<String, Any?>): Long =
        try {
            postgres.fetchAll(sql(text, args)).getOrThrow().single().get("id").asLong()
        } catch (error: Throwable) {
            throw mapSql(error)
        }

    private suspend fun execute(text: String, args: Map<String, Any?>): Long =
        try {
            postgres.execute(sql(text, args)).getOrThrow()
        } catch (error: Throwable) {
            throw mapSql(error)
        }
}

internal fun unknownIds(label: String, wanted: Set<Long>, known: Set<Long>) {
    val missing = wanted - known
    if (missing.isNotEmpty()) {
        throw ApiException(
            HttpStatusCode.Conflict,
            missing.sorted().map { "unknown $label id $it" },
        )
    }
}
