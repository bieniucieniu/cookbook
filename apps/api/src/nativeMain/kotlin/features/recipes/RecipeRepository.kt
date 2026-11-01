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
import com.bieniucieniu.cookbook.db.CommentById
import com.bieniucieniu.cookbook.db.Recipe_photos
import com.bieniucieniu.cookbook.db.SelectAllRecipeIngredientAlts
import com.bieniucieniu.cookbook.db.SelectAllRecipeToolAlts
import com.bieniucieniu.cookbook.db.SelectCommentsForRecipe
import com.bieniucieniu.cookbook.db.SelectNodeIngredients
import com.bieniucieniu.cookbook.db.SelectNodeTools
import com.bieniucieniu.cookbook.db.SelectPublicSummaries
import com.bieniucieniu.cookbook.db.SelectVisibleSummaries
import com.bieniucieniu.cookbook.features.recipes.domain.GateMode
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeGrant
import com.bieniucieniu.cookbook.features.recipes.domain.RecipePermission
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeVisibility
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoRef
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.SpanKind
import com.bieniucieniu.cookbook.features.recipes.domain.ToolHold
import com.bieniucieniu.cookbook.features.recipes.graph.Analysis
import com.bieniucieniu.cookbook.features.recipes.graph.Presence
import io.github.smyrgeorge.sqlx4k.QueryExecutor
import io.github.smyrgeorge.sqlx4k.impl.extensions.asLong
import io.github.smyrgeorge.sqlx4k.impl.extensions.asLongOrNull
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.ktor.http.HttpStatusCode

data class RecipeHead(
    val id: Long,
    val title: String,
    val description: String,
    val notes: String,
    val cooks: Int,
    val ownerId: Long?,
    val visibility: String,
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
)

data class PhotoRow(
    val id: Long,
    val recipeId: Long?,
    val ownerId: Long,
    val ord: Int,
    val storageKey: String,
    val contentType: String,
    val alt: String,
)

data class CommentRow(
    val id: Long,
    val recipeId: Long,
    val stepKey: String,
    val userId: Long,
    val email: String,
    val body: String,
    val createdAt: Long,
)

data class SavedRecipe(val id: Long, val removedPhotoKeys: List<String>)

fun photoObjectKey(storageKey: String): String = "photos/$storageKey"

data class RecipeSummary(
    val id: Long,
    val title: String,
    val cooks: Int,
    val ownerId: Long?,
    val visibility: String,
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
)

class RecipeRepository(
    private val database: CookbookDatabase,
    private val postgres: IPostgresSQL,
) {
    suspend fun visibleSummaries(userId: Long?): List<RecipeSummary> =
        if (userId == null) {
            database.recipesQueries.selectPublicSummaries().awaitAsList().map { it.toSummary() }
        } else {
            database.recipesQueries.selectVisibleSummaries(userId).awaitAsList().map { it.toSummary() }
        }

    suspend fun recipe(id: Long): RecipeHead? =
        database.recipesQueries.recipeById(id).awaitAsOneOrNull()?.let {
            RecipeHead(
                id = it.id,
                title = it.title,
                description = it.description,
                notes = it.notes,
                cooks = it.cooks,
                ownerId = it.owner_id,
                visibility = it.visibility,
                handsOnMinSeconds = it.hands_on_min_seconds ?: 0,
                handsOnMaxSeconds = it.hands_on_max_seconds ?: 0,
                elapsedMinSeconds = it.elapsed_min_seconds ?: 0,
                elapsedMaxSeconds = it.elapsed_max_seconds ?: 0,
            )
        }

    suspend fun grantFor(recipeId: Long, userId: Long): RecipePermission? =
        database.recipesQueries.grantForUser(recipeId, userId).awaitAsOneOrNull()?.let { permission(it) }

    suspend fun grants(recipeId: Long): List<RecipeGrant> =
        database.recipesQueries.grantsForRecipe(recipeId).awaitAsList().map {
            RecipeGrant(it.user_id, it.email, permission(it.permission))
        }

    suspend fun upsertGrant(recipeId: Long, userId: Long, permission: RecipePermission, grantedBy: Long) {
        database.recipesQueries.upsertGrant(recipeId, userId, permission.wire(), grantedBy)
    }

    suspend fun deleteGrant(recipeId: Long, userId: Long) {
        database.recipesQueries.deleteGrant(recipeId, userId)
    }

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

    suspend fun idByTitle(title: String): Long? =
        database.recipesQueries.recipeIdByTitle(title).awaitAsOneOrNull()

    suspend fun photos(recipeId: Long): List<PhotoRow> =
        database.recipeGraphQueries.selectPhotosForRecipe(recipeId).awaitAsList().map { it.toRow() }

    suspend fun photo(id: Long): PhotoRow? =
        database.recipeGraphQueries.photoById(id).awaitAsOneOrNull()?.toRow()

    suspend fun comments(recipeId: Long): List<CommentRow> =
        database.recipeGraphQueries.selectCommentsForRecipe(recipeId).awaitAsList().map { it.toRow() }

    suspend fun comment(recipeId: Long, commentId: Long): CommentRow? =
        database.recipeGraphQueries.commentById(commentId, recipeId).awaitAsOneOrNull()?.toRow()

    suspend fun insertPhoto(ownerId: Long, storageKey: String, contentType: String, createdAt: Long): Long =
        postgres.tx {
            fetchAll(
                sql(
                    """
                    INSERT INTO recipe_photos (owner_id, storage_key, content_type, alt, created_at)
                    VALUES (:owner_id, :storage_key, :content_type, '', :created_at)
                    RETURNING id
                    """.trimIndent(),
                    mapOf(
                        "owner_id" to ownerId,
                        "storage_key" to storageKey,
                        "content_type" to contentType,
                        "created_at" to createdAt,
                    ),
                ),
            ).getOrThrow().single().get("id").asLong()
        }

    suspend fun deletePhoto(id: Long) {
        postgres.tx {
            execute(sql("DELETE FROM recipe_photos WHERE id = :id", mapOf("id" to id))).getOrThrow()
        }
    }

    suspend fun insertComment(recipeId: Long, stepKey: String, userId: Long, body: String, createdAt: Long): Long =
        postgres.tx {
            fetchAll(
                sql(
                    """
                    INSERT INTO recipe_step_comments (recipe_id, step_key, user_id, body, created_at)
                    VALUES (:recipe_id, :step_key, :user_id, :body, :created_at)
                    RETURNING id
                    """.trimIndent(),
                    mapOf(
                        "recipe_id" to recipeId,
                        "step_key" to stepKey,
                        "user_id" to userId,
                        "body" to body,
                        "created_at" to createdAt,
                    ),
                ),
            ).getOrThrow().single().get("id").asLong()
        }

    suspend fun deleteComment(recipeId: Long, commentId: Long): Boolean {
        val deleted = postgres.tx {
            execute(
                sql(
                    "DELETE FROM recipe_step_comments WHERE recipe_id = :recipe_id AND id = :id",
                    mapOf("recipe_id" to recipeId, "id" to commentId),
                ),
            ).getOrThrow()
        }
        return deleted == 1L
    }

    suspend fun insert(write: RecipeWrite, analysis: Analysis, ownerId: Long?, actorId: Long): SavedRecipe = postgres.tx {
        val id = fetchAll(
            sql(
                """
                INSERT INTO recipes (title, cooks, owner_id, visibility, description, notes)
                VALUES (:title, :cooks, :owner_id, :visibility, :description, :notes)
                RETURNING id
                """.trimIndent(),
                mapOf(
                    "title" to write.title,
                    "cooks" to write.cooks,
                    "owner_id" to ownerId,
                    "visibility" to write.visibility.wire(),
                    "description" to write.description,
                    "notes" to write.notes,
                ),
            ),
        ).getOrThrow().single().get("id").asLong()
        writeGraph(id, write, analysis)
        val removed = attachPhotos(id, actorId, write.photos)
        SavedRecipe(id, removed)
    }

    suspend fun replace(id: Long, write: RecipeWrite, analysis: Analysis, actorId: Long): List<String> =
        postgres.tx {
            val updated = execute(
                sql(
                    """
                    UPDATE recipes
                    SET title = :title,
                        cooks = :cooks,
                        visibility = :visibility,
                        description = :description,
                        notes = :notes,
                        owner_id = COALESCE(owner_id, :actor_id)
                    WHERE id = :id
                    """.trimIndent(),
                    mapOf(
                        "id" to id,
                        "title" to write.title,
                        "cooks" to write.cooks,
                        "visibility" to write.visibility.wire(),
                        "description" to write.description,
                        "notes" to write.notes,
                        "actor_id" to actorId,
                    ),
                ),
            ).getOrThrow()
            if (updated == 0L) throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
            writeGraph(id, write, analysis)
            attachPhotos(id, actorId, write.photos)
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
                  recipe_id, key, title, body, branch_mode, join_mode, repeat_min, repeat_max, ord
                ) VALUES (
                  :recipe_id, :key, :title, :body, :branch_mode, :join_mode, :repeat_min, :repeat_max, :ord
                ) RETURNING id
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "key" to node.key,
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
    dropMissingComments(recipeId, write.nodes.map { it.key })
}

private suspend fun QueryExecutor.dropMissingComments(recipeId: Long, keys: List<String>) {
    if (keys.isEmpty()) {
        execute(sql("DELETE FROM recipe_step_comments WHERE recipe_id = :id", mapOf("id" to recipeId))).getOrThrow()
        return
    }
    val binds = keys.mapIndexed { index, key -> "k$index" to key }.toMap()
    val placeholders = binds.keys.joinToString(",") { ":$it" }
    execute(
        sql(
            "DELETE FROM recipe_step_comments WHERE recipe_id = :id AND step_key NOT IN ($placeholders)",
            mapOf("id" to recipeId) + binds,
        ),
    ).getOrThrow()
}

fun photoAttachForbidden(ownerId: Long, actorId: Long, attachedRecipeId: Long?, recipeId: Long): Boolean {
    if (attachedRecipeId == recipeId) return false
    if (ownerId != actorId) return true
    return attachedRecipeId != null
}

private suspend fun QueryExecutor.attachPhotos(recipeId: Long, actorId: Long, photos: List<PhotoRef>): List<String> {
    val wanted = photos.map { it.id }
    if (wanted.size != wanted.toSet().size) {
        throw ApiException(HttpStatusCode.BadRequest, listOf("photo ids must be unique"))
    }
    val current = fetchAll(
        sql(
            """
            SELECT id, storage_key
            FROM recipe_photos
            WHERE recipe_id = :recipe_id
            """.trimIndent(),
            mapOf("recipe_id" to recipeId),
        ),
    ).getOrThrow()
    for ((index, photo) in photos.withIndex()) {
        val row = fetchAll(
            sql(
                """
                SELECT id, recipe_id, owner_id
                FROM recipe_photos
                WHERE id = :id
                """.trimIndent(),
                mapOf("id" to photo.id),
            ),
        ).getOrThrow().singleOrNull() ?: throw ApiException(HttpStatusCode.BadRequest, listOf("photo not found"))
        val ownerId = row.get("owner_id").asLong()
        val attached = row.get("recipe_id").asLongOrNull()
        if (photoAttachForbidden(ownerId, actorId, attached, recipeId)) {
            throw ApiException(HttpStatusCode.Forbidden, listOf("forbidden"))
        }
        execute(
            sql(
                """
                UPDATE recipe_photos
                SET recipe_id = :recipe_id, ord = :ord, alt = :alt
                WHERE id = :id
                """.trimIndent(),
                mapOf(
                    "recipe_id" to recipeId,
                    "ord" to index,
                    "alt" to photo.alt,
                    "id" to photo.id,
                ),
            ),
        ).getOrThrow()
    }
    val removed = current.filter { it.get("id").asLong() !in wanted }
    for (row in removed) {
        execute(
            sql("DELETE FROM recipe_photos WHERE id = :id", mapOf("id" to row.get("id").asLong())),
        ).getOrThrow()
    }
    return removed.map { it.get("storage_key").asString() }
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

private fun RecipeVisibility.wire(): String = when (this) {
    RecipeVisibility.Public -> "public"
    RecipeVisibility.Private -> "private"
}

private fun RecipePermission.wire(): String = when (this) {
    RecipePermission.Read -> "read"
    RecipePermission.Write -> "write"
}

private fun permission(value: String): RecipePermission = when (value) {
    "write" -> RecipePermission.Write
    else -> RecipePermission.Read
}

private fun SelectPublicSummaries.toSummary() = RecipeSummary(
    id = id,
    title = title,
    cooks = cooks,
    ownerId = owner_id,
    visibility = visibility,
    handsOnMinSeconds = hands_on_min_seconds ?: 0,
    handsOnMaxSeconds = hands_on_max_seconds ?: 0,
    elapsedMinSeconds = elapsed_min_seconds ?: 0,
    elapsedMaxSeconds = elapsed_max_seconds ?: 0,
)

private fun Recipe_photos.toRow() = PhotoRow(
    id = id,
    recipeId = recipe_id,
    ownerId = owner_id,
    ord = ord,
    storageKey = storage_key,
    contentType = content_type,
    alt = alt,
)

private fun SelectCommentsForRecipe.toRow() = CommentRow(
    id = id,
    recipeId = recipe_id,
    stepKey = step_key,
    userId = user_id,
    email = email,
    body = body,
    createdAt = created_at,
)

private fun CommentById.toRow() = CommentRow(
    id = id,
    recipeId = recipe_id,
    stepKey = step_key,
    userId = user_id,
    email = email,
    body = body,
    createdAt = created_at,
)

private fun SelectVisibleSummaries.toSummary() = RecipeSummary(
    id = id,
    title = title,
    cooks = cooks,
    ownerId = owner_id,
    visibility = visibility,
    handsOnMinSeconds = hands_on_min_seconds ?: 0,
    handsOnMaxSeconds = hands_on_max_seconds ?: 0,
    elapsedMinSeconds = elapsed_min_seconds ?: 0,
    elapsedMaxSeconds = elapsed_max_seconds ?: 0,
)
