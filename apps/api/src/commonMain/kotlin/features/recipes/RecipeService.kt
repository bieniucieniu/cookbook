package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.features.catalog.CatalogRepository
import com.bieniucieniu.cookbook.features.catalog.unknownIds
import com.bieniucieniu.cookbook.features.recipes.domain.CommentResponse
import com.bieniucieniu.cookbook.features.recipes.domain.CommentWrite
import com.bieniucieniu.cookbook.features.recipes.domain.EdgeResponse
import com.bieniucieniu.cookbook.features.recipes.domain.GateMode
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientSwapResponse
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientFactResponse
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientUse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientResponse
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoRef
import com.bieniucieniu.cookbook.features.recipes.domain.NodeResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolResponse
import com.bieniucieniu.cookbook.features.recipes.domain.ParallelPair
import com.bieniucieniu.cookbook.features.recipes.domain.Presence
import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.AuthRepository
import com.bieniucieniu.cookbook.features.auth.nowSeconds
import com.bieniucieniu.cookbook.features.recipes.domain.GrantWrite
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeDetail
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeGrant
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeListItem
import com.bieniucieniu.cookbook.features.recipes.domain.RecipePermission
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeVisibility
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.SpanKind
import com.bieniucieniu.cookbook.features.recipes.domain.SpanResponse
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeSummary
import com.bieniucieniu.cookbook.features.recipes.domain.ToolSwapResponse
import com.bieniucieniu.cookbook.features.recipes.domain.ToolFactResponse
import com.bieniucieniu.cookbook.features.recipes.domain.ToolHold
import com.bieniucieniu.cookbook.features.recipes.graph.Analysis
import com.bieniucieniu.cookbook.features.recipes.graph.GraphFailure
import com.bieniucieniu.cookbook.features.recipes.graph.InputEdge
import com.bieniucieniu.cookbook.features.recipes.graph.InputGraph
import com.bieniucieniu.cookbook.features.recipes.graph.InputIngredient
import com.bieniucieniu.cookbook.features.recipes.graph.InputNode
import com.bieniucieniu.cookbook.features.recipes.graph.InputSpan
import com.bieniucieniu.cookbook.features.recipes.graph.InputTool
import com.bieniucieniu.cookbook.features.recipes.graph.SearchAlt
import com.bieniucieniu.cookbook.features.recipes.graph.SearchQuery
import com.bieniucieniu.cookbook.features.recipes.graph.SearchRecipe
import com.bieniucieniu.cookbook.features.recipes.graph.SearchToolAlt
import com.bieniucieniu.cookbook.features.recipes.graph.analyze
import com.bieniucieniu.cookbook.features.recipes.graph.avoidNodes
import com.bieniucieniu.cookbook.features.recipes.graph.search
import com.bieniucieniu.cookbook.s3.DeleteObjectRequest
import com.bieniucieniu.cookbook.s3.S3Client
import com.bieniucieniu.cookbook.s3.S3Exception
import io.ktor.http.HttpStatusCode

class RecipeService(
    private val recipes: RecipeRepository,
    private val catalog: CatalogRepository,
    private val users: AuthRepository,
    private val storage: S3Client,
    private val bucket: String,
) {
    suspend fun list(actorId: Long?, query: SearchQuery): List<RecipeListItem> {
        val allergens = allergensFor(query)
        val visible = recipes.visibleSummaries(actorId)
        val ids = visible.map { it.id }.toSet()
        val ingredientFacts = recipes.allIngredientFacts().filter { it.recipe_id in ids }.groupBy { it.recipe_id }
        val toolFacts = recipes.allToolFacts().filter { it.recipe_id in ids }.groupBy { it.recipe_id }
        val ingredientAlts = recipes.allIngredientAlts().filter { it.recipe_id in ids }.groupBy { it.recipe_id }
        val toolAlts = recipes.allToolAlts().filter { it.recipe_id in ids }.groupBy { it.recipe_id }
        val meta = visible.associateBy { it.id }
        val rows = visible.map { row ->
            SearchRecipe(
                id = row.id,
                title = row.title,
                cooks = row.cooks,
                handsOnMinSeconds = row.handsOnMinSeconds,
                handsOnMaxSeconds = row.handsOnMaxSeconds,
                elapsedMinSeconds = row.elapsedMinSeconds,
                elapsedMaxSeconds = row.elapsedMaxSeconds,
                ingredientFacts = ingredientFacts[row.id].orEmpty().associate {
                    it.ingredient_id to presence(it.presence)
                },
                toolFacts = toolFacts[row.id].orEmpty().associate {
                    it.tool_id to presence(it.presence)
                },
                ingredientAlts = ingredientAlts[row.id].orEmpty().map {
                    SearchAlt(it.ingredient_id, it.alt_ingredient_id)
                },
                toolAlts = toolAlts[row.id].orEmpty().map {
                    SearchToolAlt(it.tool_id, it.alt_tool_id)
                },
                allergensByIngredient = allergens,
            )
        }
        return search(rows, query).map { hit ->
            val recipe = hit.recipe
            val summary = meta.getValue(recipe.id)
            RecipeListItem(
                id = recipe.id,
                title = recipe.title,
                cooks = recipe.cooks,
                ownerId = summary.ownerId,
                visibility = visibility(summary.visibility),
                handsOnMinSeconds = recipe.handsOnMinSeconds,
                handsOnMaxSeconds = recipe.handsOnMaxSeconds,
                elapsedMinSeconds = recipe.elapsedMinSeconds,
                elapsedMaxSeconds = recipe.elapsedMaxSeconds,
                missingCount = hit.missingCount,
                dislikeHits = hit.dislikeHits,
            )
        }
    }

    suspend fun get(actorId: Long?, id: Long, query: SearchQuery): RecipeDetail {
        val recipe = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        require(actorId, recipe, RecipeAction.Read)
        val photos = recipes.photos(id).map { PhotoRef(it.id, it.alt) }
        val comments = recipes.comments(id).map { it.toResponse() }
        val nodes = recipes.nodes(id)
        val ingredientRows = recipes.nodeIngredients(id)
        val toolRows = recipes.nodeTools(id)
        val spanRows = recipes.spans(id)
        val edgeRows = recipes.edges(id)
        val ingredientAlts = recipes.ingredientAlts(id)
        val toolAlts = recipes.toolAlts(id)
        if (nodes.isEmpty()) {
            return recipe.toDetail(photos, comments, summary = RecipeSummary(emptyList(), emptyList(), 0))
        }
        val ingredientsByNode = ingredientRows.groupBy { it.node_id }
        val toolsByNode = toolRows.groupBy { it.node_id }
        val spansByNode = spanRows.groupBy { it.node_id }
        val analysis = try {
            analyze(storedGraph(recipe.cooks, nodes, edgeRows, spansByNode, ingredientsByNode, toolsByNode))
        } catch (failure: GraphFailure) {
            throw ApiException(HttpStatusCode.BadRequest, failure.errors)
        }
        val searchRecipe = SearchRecipe(
            id = recipe.id,
            title = recipe.title,
            cooks = recipe.cooks,
            handsOnMinSeconds = recipe.handsOnMinSeconds,
            handsOnMaxSeconds = recipe.handsOnMaxSeconds,
            elapsedMinSeconds = recipe.elapsedMinSeconds,
            elapsedMaxSeconds = recipe.elapsedMaxSeconds,
            ingredientFacts = analysis.ingredientFacts,
            toolFacts = analysis.toolFacts,
            ingredientAlts = ingredientAlts.map { SearchAlt(it.ingredient_id, it.alt_ingredient_id) },
            toolAlts = toolAlts.map { SearchToolAlt(it.tool_id, it.alt_tool_id) },
            allergensByIngredient = allergensFor(query),
        )
        val avoid = avoidNodes(analysis.alternatives, searchRecipe, query).map { it.toLong() }.sorted()
        val ingredientSwaps = ingredientAlts.groupBy { it.node_id to it.ingredient_id }
        val toolSwaps = toolAlts.groupBy { it.node_id to it.tool_id }
        val nodeResponses = nodes.map { node ->
            val ingredients = ingredientsByNode[node.id].orEmpty()
            val tools = toolsByNode[node.id].orEmpty()
            NodeResponse(
                id = node.id,
                key = node.key,
                title = node.title,
                body = node.body,
                branchMode = gate(node.branch_mode),
                joinMode = gate(node.join_mode),
                repeatMin = node.repeat_min,
                repeatMax = node.repeat_max,
                ord = node.ord,
                spans = spansByNode[node.id].orEmpty().map {
                    SpanResponse(ord = it.ord, kind = spanKind(it.kind), seconds = it.seconds)
                },
                ingredients = ingredients.map { row ->
                    NodeIngredientResponse(
                        row.ingredient_id,
                        row.slug,
                        row.qty,
                        row.unit,
                        row.optional,
                        ingredientSwaps[node.id to row.ingredient_id].orEmpty().map {
                            IngredientSwapResponse(it.alt_ingredient_id, it.slug, it.ratio, it.note)
                        },
                    )
                },
                ingredientMap = ingredients.associate { row ->
                    row.slug to IngredientUse(row.ingredient_id, row.qty, row.unit, row.optional)
                },
                tools = tools.map { row ->
                    NodeToolResponse(
                        row.tool_id,
                        row.slug,
                        row.optional,
                        toolHold(row.hold),
                        toolSwaps[node.id to row.tool_id].orEmpty().map {
                            ToolSwapResponse(it.alt_tool_id, it.slug, it.note)
                        },
                    )
                },
            )
        }
        val ingredientFacts = recipes.ingredientFacts(id).map {
            IngredientFactResponse(it.ingredient_id, presence(it.presence))
        }
        val toolFacts = recipes.toolFacts(id).map { ToolFactResponse(it.tool_id, presence(it.presence)) }
        return recipe.toDetail(
            photos = photos,
            comments = comments,
            nodes = nodeResponses,
            edges = edgeRows.map { EdgeResponse(it.from_node_id, it.to_node_id, it.label) },
            summary = summarize(
                nodeResponses,
                ingredientFacts.associate { it.ingredientId to it.presence },
                toolFacts.associate { it.toolId to it.presence },
            ),
            ingredientFacts = ingredientFacts,
            toolFacts = toolFacts,
            parallelPairs = analysis.parallelPairs.map { (left, right) ->
                ParallelPair(left.toLong(), right.toLong())
            }.sortedWith(compareBy({ it.nodeId }, { it.otherNodeId })),
            avoidNodeIds = avoid,
        )
    }

    /** The allergen map only matters when the query excludes something, so skip the table read otherwise. */
    private suspend fun allergensFor(query: SearchQuery): Map<Long, Set<Long>> =
        if (!query.hasExclusions) emptyMap()
        else catalog.allergensByIngredient().mapValues { (_, ids) -> ids.toSet() }

    suspend fun create(actor: Actor, write: RecipeWrite, ownerId: Long? = actor.userId): RecipeDetail {
        val analysis = prepare(write)
        val saved = recipes.insert(write, analysis, ownerId, actor.userId)
        deleteObjects(saved.removedPhotoKeys)
        return get(actor.userId, saved.id, SearchQuery())
    }

    suspend fun update(actor: Actor, id: Long, write: RecipeWrite): RecipeDetail {
        val current = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        require(actor.userId, current, RecipeAction.Update)
        if (visibility(current.visibility) != write.visibility) {
            require(actor.userId, current, RecipeAction.ChangeVisibility)
        }
        val analysis = prepare(write)
        val removed = recipes.replace(id, write, analysis, actor.userId)
        deleteObjects(removed)
        return get(actor.userId, id, SearchQuery())
    }

    suspend fun delete(actor: Actor, id: Long) {
        val current = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        require(actor.userId, current, RecipeAction.Delete)
        val keys = recipes.photos(id).map { it.storageKey }
        if (!recipes.delete(id)) throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        deleteObjects(keys)
    }

    suspend fun comment(actor: Actor, id: Long, write: CommentWrite): CommentResponse {
        val current = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        require(actor.userId, current, RecipeAction.Read)
        val errors = mutableListOf<String>()
        if (write.stepKey.isBlank()) errors += "stepKey must not be blank"
        if (write.body.isBlank()) errors += "body must not be blank"
        if (errors.isNotEmpty()) throw ApiException(HttpStatusCode.BadRequest, errors)
        val keys = recipes.nodes(id).map { it.key }.toSet()
        if (write.stepKey !in keys) throw ApiException(HttpStatusCode.BadRequest, listOf("unknown step ${write.stepKey}"))
        val user = users.userById(actor.userId) ?: throw ApiException(HttpStatusCode.Unauthorized, listOf("login required"))
        val createdAt = nowSeconds()
        val commentId = recipes.insertComment(id, write.stepKey, actor.userId, write.body, createdAt)
        return CommentResponse(commentId, write.stepKey, actor.userId, user.email, write.body, createdAt)
    }

    suspend fun deleteComment(actor: Actor, id: Long, commentId: Long) {
        val current = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        val comment = recipes.comment(id, commentId) ?: throw ApiException(HttpStatusCode.NotFound, listOf("comment not found"))
        val allowed = comment.userId == actor.userId || (current.ownerId != null && current.ownerId == actor.userId)
        if (!allowed) {
            require(actor.userId, current, RecipeAction.Read)
            throw ApiException(HttpStatusCode.Forbidden, listOf("forbidden"))
        }
        if (!recipes.deleteComment(id, commentId)) {
            throw ApiException(HttpStatusCode.NotFound, listOf("comment not found"))
        }
    }

    suspend fun grants(actor: Actor, id: Long): List<RecipeGrant> {
        val current = loadOwned(actor, id)
        return recipes.grants(current.id)
    }

    suspend fun grant(actor: Actor, id: Long, write: GrantWrite): List<RecipeGrant> {
        val current = loadOwned(actor, id)
        if (write.email.isBlank()) throw ApiException(HttpStatusCode.BadRequest, listOf("email is required"))
        val user = users.userByEmail(write.email)
            ?: throw ApiException(HttpStatusCode.NotFound, listOf("user not found"))
        if (user.id == current.ownerId) throw ApiException(HttpStatusCode.BadRequest, listOf("owner already has access"))
        recipes.upsertGrant(id, user.id, write.permission, actor.userId)
        return recipes.grants(id)
    }

    suspend fun revoke(actor: Actor, id: Long, userId: Long) {
        loadOwned(actor, id)
        recipes.deleteGrant(id, userId)
    }

    private suspend fun loadOwned(actor: Actor, id: Long): RecipeHead {
        val current = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        require(actor.userId, current, RecipeAction.Grant)
        return current
    }

    private suspend fun require(actorId: Long?, recipe: RecipeHead, action: RecipeAction) {
        val denied = recipes.denial(actorId, recipe, action)
        if (denied != null) throw ApiException(denied, listOf(if (denied == HttpStatusCode.NotFound) "recipe not found" else "forbidden"))
    }

    private suspend fun prepare(write: RecipeWrite): Analysis {
        val errors = mutableListOf<String>()
        if (write.title.isBlank()) errors += "title must not be blank"
        if (write.nodes.any { it.key.isBlank() }) errors += "step key must not be blank"
        if (write.nodes.map { it.key }.size != write.nodes.map { it.key }.toSet().size) {
            errors += "step keys must be unique"
        }
        if (write.nodes.any { it.title.isBlank() }) errors += "step title must not be blank"
        if (write.nodes.any { node -> node.ingredients.any { it.qty != null && it.qty < 0.0 } }) {
            errors += "ingredient qty must be >= 0"
        }
        errors += stepItemErrors(write.nodes)
        val analysis = try {
            analyze(write.toGraph())
        } catch (failure: GraphFailure) {
            errors += failure.errors
            null
        }
        if (errors.isNotEmpty() || analysis == null) throw ApiException(HttpStatusCode.BadRequest, errors)
        val ingredientIds = write.nodes.flatMap { node ->
            node.ingredients.flatMap { use -> listOf(use.ingredientId) + use.alts.map { it.altIngredientId } }
        }.toSet()
        val toolIds = write.nodes.flatMap { node ->
            node.tools.flatMap { use -> listOf(use.toolId) + use.alts.map { it.altToolId } }
        }.toSet()
        unknownIds("ingredient", ingredientIds, catalog.ingredientIds())
        unknownIds("tool", toolIds, catalog.toolIds())
        return analysis
    }

    private suspend fun deleteObjects(storageKeys: List<String>) {
        for (storageKey in storageKeys) {
            try {
                storage.deleteObject(DeleteObjectRequest(bucket, photoObjectKey(storageKey)))
            } catch (error: S3Exception) {
                if (error.status == 404) continue
                throw ApiException(HttpStatusCode.BadGateway, listOf("photo storage failed"))
            }
        }
    }
}

private fun CommentRow.toResponse() = CommentResponse(
    id = id,
    stepKey = stepKey,
    userId = userId,
    email = email,
    body = body,
    createdAt = createdAt,
)

private fun RecipeHead.toDetail(
    photos: List<PhotoRef>,
    comments: List<CommentResponse>,
    summary: RecipeSummary,
    nodes: List<NodeResponse> = emptyList(),
    edges: List<EdgeResponse> = emptyList(),
    ingredientFacts: List<IngredientFactResponse> = emptyList(),
    toolFacts: List<ToolFactResponse> = emptyList(),
    parallelPairs: List<ParallelPair> = emptyList(),
    avoidNodeIds: List<Long> = emptyList(),
) = RecipeDetail(
    id = id,
    title = title,
    description = description,
    notes = notes,
    cooks = cooks,
    ownerId = ownerId,
    visibility = visibility(visibility),
    handsOnMinSeconds = handsOnMinSeconds,
    handsOnMaxSeconds = handsOnMaxSeconds,
    elapsedMinSeconds = elapsedMinSeconds,
    elapsedMaxSeconds = elapsedMaxSeconds,
    nodes = nodes,
    edges = edges,
    summary = summary,
    ingredientFacts = ingredientFacts,
    toolFacts = toolFacts,
    parallelPairs = parallelPairs,
    avoidNodeIds = avoidNodeIds,
    photos = photos,
    comments = comments,
)

private fun RecipeWrite.toGraph() = InputGraph(
    cooks = cooks,
    nodes = nodes.map { node ->
        InputNode(
            key = node.key,
            branch = node.branchMode,
            join = node.joinMode,
            repeatMin = node.repeatMin,
            repeatMax = node.repeatMax,
            spans = node.spans.map { InputSpan(it.ord, it.kind, it.seconds) },
            ingredients = node.ingredients.map { InputIngredient(it.ingredientId, it.optional) },
            tools = node.tools.map { InputTool(it.toolId, it.optional, it.hold) },
        )
    },
    edges = edges.map { InputEdge(it.from, it.to) },
)

private fun storedGraph(
    cooks: Int,
    nodes: List<com.bieniucieniu.cookbook.db.Recipe_nodes>,
    edges: List<com.bieniucieniu.cookbook.db.Recipe_edges>,
    spans: Map<Long, List<com.bieniucieniu.cookbook.db.Recipe_node_spans>>,
    ingredients: Map<Long, List<com.bieniucieniu.cookbook.db.SelectNodeIngredients>>,
    tools: Map<Long, List<com.bieniucieniu.cookbook.db.SelectNodeTools>>,
) = InputGraph(
    cooks = cooks,
    nodes = nodes.map { node ->
        InputNode(
            key = node.id.toString(),
            branch = gate(node.branch_mode),
            join = gate(node.join_mode),
            repeatMin = node.repeat_min,
            repeatMax = node.repeat_max,
            spans = spans[node.id].orEmpty().map { InputSpan(it.ord, spanKind(it.kind), it.seconds) },
            ingredients = ingredients[node.id].orEmpty().map { InputIngredient(it.ingredient_id, it.optional) },
            tools = tools[node.id].orEmpty().map { InputTool(it.tool_id, it.optional, toolHold(it.hold)) },
        )
    },
    edges = edges.map { InputEdge(it.from_node_id.toString(), it.to_node_id.toString()) },
)

internal fun visibility(value: String): RecipeVisibility = when (value) {
    "private" -> RecipeVisibility.Private
    else -> RecipeVisibility.Public
}

// Unknown stored values fall back to the first entry (the column default).
private fun gate(value: String): GateMode = GateMode.entries.firstOrNull { it.db == value } ?: GateMode.None

private fun spanKind(value: String): SpanKind = SpanKind.entries.firstOrNull { it.db == value } ?: SpanKind.Active

private fun toolHold(value: String): ToolHold = ToolHold.entries.firstOrNull { it.db == value } ?: ToolHold.Active

private fun presence(value: String): Presence = Presence.entries.firstOrNull { it.db == value } ?: Presence.AllPaths
