package com.bieniucieniu.cookbook.features.recipes

import app.cash.sqldelight.async.coroutines.awaitAsList
import app.cash.sqldelight.async.coroutines.awaitAsOneOrNull
import com.bieniucieniu.cookbook.core.database.sql
import com.bieniucieniu.cookbook.core.database.tx
import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.db.CookbookDatabase
import com.bieniucieniu.cookbook.db.Recipe_edges
import com.bieniucieniu.cookbook.db.Recipe_ingredient_alts
import com.bieniucieniu.cookbook.db.Recipe_ingredient_facts
import com.bieniucieniu.cookbook.db.Recipe_node_spans
import com.bieniucieniu.cookbook.db.Recipe_nodes
import com.bieniucieniu.cookbook.db.Recipe_tool_alts
import com.bieniucieniu.cookbook.db.Recipe_tool_facts
import com.bieniucieniu.cookbook.db.Recipes
import com.bieniucieniu.cookbook.db.SelectAllRecipeIngredientAlts
import com.bieniucieniu.cookbook.db.SelectAllRecipeToolAlts
import com.bieniucieniu.cookbook.db.SelectNodeIngredients
import com.bieniucieniu.cookbook.db.SelectNodeTools
import com.bieniucieniu.cookbook.db.SelectSummaries
import com.bieniucieniu.cookbook.features.recipes.domain.GateMode
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.SpanKind
import com.bieniucieniu.cookbook.features.recipes.domain.ToolHold
import com.bieniucieniu.cookbook.features.recipes.graph.Analysis
import com.bieniucieniu.cookbook.features.recipes.graph.Presence
import io.github.smyrgeorge.sqlx4k.QueryExecutor
import io.github.smyrgeorge.sqlx4k.impl.extensions.asLong
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.ktor.http.HttpStatusCode

class RecipeRepository(
    private val database: CookbookDatabase,
    private val postgres: IPostgresSQL,
) {
    suspend fun summaries(): List<SelectSummaries> =
        database.recipesQueries.selectSummaries().awaitAsList()

    suspend fun recipe(id: Long): Recipes? =
        database.recipesQueries.recipeById(id).awaitAsOneOrNull()

    suspend fun nodes(recipeId: Long): List<Recipe_nodes> =
        database.recipeGraphQueries.selectNodes(recipeId).awaitAsList()

    suspend fun edges(recipeId: Long): List<Recipe_edges> =
        database.recipeGraphQueries.selectEdges(recipeId).awaitAsList()

    suspend fun spans(recipeId: Long): List<Recipe_node_spans> =
        database.recipeGraphQueries.selectSpans(recipeId).awaitAsList()

    suspend fun nodeIngredients(recipeId: Long): List<SelectNodeIngredients> =
        database.recipeGraphQueries.selectNodeIngredients(recipeId).awaitAsList()

    suspend fun nodeTools(recipeId: Long): List<SelectNodeTools> =
        database.recipeGraphQueries.selectNodeTools(recipeId).awaitAsList()

    suspend fun ingredientAlts(recipeId: Long): List<Recipe_ingredient_alts> =
        database.recipeGraphQueries.selectRecipeIngredientAlts(recipeId).awaitAsList()

    suspend fun toolAlts(recipeId: Long): List<Recipe_tool_alts> =
        database.recipeGraphQueries.selectRecipeToolAlts(recipeId).awaitAsList()

    suspend fun ingredientFacts(recipeId: Long): List<Recipe_ingredient_facts> =
        database.recipeGraphQueries.selectIngredientFactsForRecipe(recipeId).awaitAsList()

    suspend fun toolFacts(recipeId: Long): List<Recipe_tool_facts> =
        database.recipeGraphQueries.selectToolFactsForRecipe(recipeId).awaitAsList()

    suspend fun allIngredientFacts(): List<Recipe_ingredient_facts> =
        database.recipeGraphQueries.selectAllIngredientFacts().awaitAsList()

    suspend fun allToolFacts(): List<Recipe_tool_facts> =
        database.recipeGraphQueries.selectAllToolFacts().awaitAsList()

    suspend fun allIngredientAlts(): List<SelectAllRecipeIngredientAlts> =
        database.recipeGraphQueries.selectAllRecipeIngredientAlts().awaitAsList()

    suspend fun allToolAlts(): List<SelectAllRecipeToolAlts> =
        database.recipeGraphQueries.selectAllRecipeToolAlts().awaitAsList()

    suspend fun insert(write: RecipeWrite, analysis: Analysis): Long = postgres.tx {
        val id = fetchAll(
            sql(
                "INSERT INTO recipes (title, cooks) VALUES (:title, :cooks) RETURNING id",
                mapOf("title" to write.title, "cooks" to write.cooks),
            ),
        ).getOrThrow().single().get("id").asLong()
        writeGraph(id, write, analysis)
        id
    }

    suspend fun replace(id: Long, write: RecipeWrite, analysis: Analysis) {
        postgres.tx {
            val updated = execute(
                sql(
                    "UPDATE recipes SET title = :title, cooks = :cooks WHERE id = :id",
                    mapOf("id" to id, "title" to write.title, "cooks" to write.cooks),
                ),
            ).getOrThrow()
            if (updated == 0L) throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
            writeGraph(id, write, analysis)
        }
    }

    suspend fun delete(id: Long): Boolean {
        val deleted = postgres.tx {
            execute(sql("DELETE FROM recipes WHERE id = :id", mapOf("id" to id))).getOrThrow()
        }
        return deleted == 1L
    }
}

private suspend fun QueryExecutor.writeGraph(recipeId: Long, write: RecipeWrite, analysis: Analysis) {
    for (table in listOf(
        "recipe_ingredient_facts",
        "recipe_tool_facts",
        "recipe_time",
        "recipe_ingredient_alts",
        "recipe_tool_alts",
        "recipe_nodes",
    )) {
        execute(sql("DELETE FROM $table WHERE recipe_id = :id", mapOf("id" to recipeId))).getOrThrow()
    }
    val ids = mutableMapOf<String, Long>()
    for (node in write.nodes) {
        val nodeId = fetchAll(
            sql(
                """
                INSERT INTO recipe_nodes (
                  recipe_id, title, body, branch_mode, join_mode, repeat_min, repeat_max, ord
                ) VALUES (
                  :recipe_id, :title, :body, :branch_mode, :join_mode, :repeat_min, :repeat_max, :ord
                ) RETURNING id
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "title" to node.title,
                    "body" to node.body,
                    "branch_mode" to node.branchMode.db(),
                    "join_mode" to node.joinMode.db(),
                    "repeat_min" to node.repeatMin,
                    "repeat_max" to node.repeatMax,
                    "ord" to node.ord,
                ),
            ),
        ).getOrThrow().single().get("id").asLong()
        ids[node.key] = nodeId
        for (span in node.spans) {
            execute(
                sql(
                    """
                    INSERT INTO recipe_node_spans (node_id, ord, kind, seconds)
                    VALUES (:node_id, :ord, :kind, :seconds)
                    """.trimIndent(),
                    mapOf(
                        "node_id" to nodeId,
                        "ord" to span.ord,
                        "kind" to span.kind.db(),
                        "seconds" to span.seconds,
                    ),
                ),
            ).getOrThrow()
        }
        for (ingredient in node.ingredients) {
            execute(
                sql(
                    """
                    INSERT INTO node_ingredients (node_id, ingredient_id, qty, unit, optional)
                    VALUES (:node_id, :ingredient_id, :qty, :unit, :optional)
                    """.trimIndent(),
                    mapOf(
                        "node_id" to nodeId,
                        "ingredient_id" to ingredient.ingredientId,
                        "qty" to ingredient.qty,
                        "unit" to ingredient.unit,
                        "optional" to ingredient.optional,
                    ),
                ),
            ).getOrThrow()
        }
        for (tool in node.tools) {
            execute(
                sql(
                    """
                    INSERT INTO node_tools (node_id, tool_id, optional, hold)
                    VALUES (:node_id, :tool_id, :optional, :hold)
                    """.trimIndent(),
                    mapOf(
                        "node_id" to nodeId,
                        "tool_id" to tool.toolId,
                        "optional" to tool.optional,
                        "hold" to tool.hold.db(),
                    ),
                ),
            ).getOrThrow()
        }
    }
    for (edge in write.edges) {
        execute(
            sql(
                """
                INSERT INTO recipe_edges (recipe_id, from_node_id, to_node_id, label)
                VALUES (:recipe_id, :from_node_id, :to_node_id, :label)
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "from_node_id" to ids.getValue(edge.from),
                    "to_node_id" to ids.getValue(edge.to),
                    "label" to edge.label,
                ),
            ),
        ).getOrThrow()
    }
    for (alt in write.ingredientAlts) {
        execute(
            sql(
                """
                INSERT INTO recipe_ingredient_alts (
                  recipe_id, ingredient_id, alt_ingredient_id, node_id, ratio, note
                ) VALUES (
                  :recipe_id, :ingredient_id, :alt_ingredient_id, :node_id, :ratio, :note
                )
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "ingredient_id" to alt.ingredientId,
                    "alt_ingredient_id" to alt.altIngredientId,
                    "node_id" to alt.nodeKey?.let { ids.getValue(it) },
                    "ratio" to alt.ratio,
                    "note" to alt.note,
                ),
            ),
        ).getOrThrow()
    }
    for (alt in write.toolAlts) {
        execute(
            sql(
                """
                INSERT INTO recipe_tool_alts (recipe_id, tool_id, alt_tool_id, node_id, note)
                VALUES (:recipe_id, :tool_id, :alt_tool_id, :node_id, :note)
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "tool_id" to alt.toolId,
                    "alt_tool_id" to alt.altToolId,
                    "node_id" to alt.nodeKey?.let { ids.getValue(it) },
                    "note" to alt.note,
                ),
            ),
        ).getOrThrow()
    }
    for ((ingredientId, presence) in analysis.ingredientFacts) {
        execute(
            sql(
                """
                INSERT INTO recipe_ingredient_facts (recipe_id, ingredient_id, presence)
                VALUES (:recipe_id, :ingredient_id, :presence)
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "ingredient_id" to ingredientId,
                    "presence" to presence.db(),
                ),
            ),
        ).getOrThrow()
    }
    for ((toolId, presence) in analysis.toolFacts) {
        execute(
            sql(
                """
                INSERT INTO recipe_tool_facts (recipe_id, tool_id, presence)
                VALUES (:recipe_id, :tool_id, :presence)
                """.trimIndent(),
                mapOf("recipe_id" to recipeId, "tool_id" to toolId, "presence" to presence.db()),
            ),
        ).getOrThrow()
    }
    val time = analysis.time
    execute(
        sql(
            """
            INSERT INTO recipe_time (
              recipe_id, hands_on_min_seconds, hands_on_max_seconds, elapsed_min_seconds, elapsed_max_seconds
            ) VALUES (
              :recipe_id, :hands_on_min_seconds, :hands_on_max_seconds, :elapsed_min_seconds, :elapsed_max_seconds
            )
            """.trimIndent(),
            mapOf(
                "recipe_id" to recipeId,
                "hands_on_min_seconds" to time.handsOnMinSeconds,
                "hands_on_max_seconds" to time.handsOnMaxSeconds,
                "elapsed_min_seconds" to time.elapsedMinSeconds,
                "elapsed_max_seconds" to time.elapsedMaxSeconds,
            ),
        ),
    ).getOrThrow()
}

private fun GateMode.db(): String = when (this) {
    GateMode.None -> "none"
    GateMode.And -> "and"
    GateMode.Xor -> "xor"
}

private fun SpanKind.db(): String = when (this) {
    SpanKind.Active -> "active"
    SpanKind.Wait -> "wait"
}

private fun ToolHold.db(): String = when (this) {
    ToolHold.Active -> "active"
    ToolHold.Span -> "span"
}

private fun Presence.db(): String = when (this) {
    Presence.AllPaths -> "all_paths"
    Presence.SomePaths -> "some_paths"
}
