package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.features.catalog.CatalogRepository
import com.bieniucieniu.cookbook.features.catalog.unknownIds
import com.bieniucieniu.cookbook.features.recipes.domain.EdgeResponse
import com.bieniucieniu.cookbook.features.recipes.domain.GateMode
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientAltResponse
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientAltWrite
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientFactResponse
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientUse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolResponse
import com.bieniucieniu.cookbook.features.recipes.domain.ParallelPair
import com.bieniucieniu.cookbook.features.recipes.domain.Presence
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeDetail
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeListItem
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.SpanKind
import com.bieniucieniu.cookbook.features.recipes.domain.SpanResponse
import com.bieniucieniu.cookbook.features.recipes.domain.ToolAltResponse
import com.bieniucieniu.cookbook.features.recipes.domain.ToolAltWrite
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
import io.ktor.http.HttpStatusCode
import com.bieniucieniu.cookbook.features.recipes.graph.GateMode as GraphGate
import com.bieniucieniu.cookbook.features.recipes.graph.Presence as GraphPresence
import com.bieniucieniu.cookbook.features.recipes.graph.SpanKind as GraphSpan
import com.bieniucieniu.cookbook.features.recipes.graph.ToolHold as GraphHold

class RecipeService(
    private val recipes: RecipeRepository,
    private val catalog: CatalogRepository,
) {
    suspend fun list(query: SearchQuery): List<RecipeListItem> {
        val allergens = catalog.allergensByIngredient().mapValues { (_, ids) -> ids.toSet() }
        val ingredientFacts = recipes.allIngredientFacts().groupBy { it.recipe_id }
        val toolFacts = recipes.allToolFacts().groupBy { it.recipe_id }
        val ingredientAlts = recipes.allIngredientAlts().groupBy { it.recipe_id }
        val toolAlts = recipes.allToolAlts().groupBy { it.recipe_id }
        val rows = recipes.summaries().map { row ->
            SearchRecipe(
                id = row.id,
                title = row.title,
                cooks = row.cooks,
                handsOnMinSeconds = row.hands_on_min_seconds ?: 0,
                handsOnMaxSeconds = row.hands_on_max_seconds ?: 0,
                elapsedMinSeconds = row.elapsed_min_seconds ?: 0,
                elapsedMaxSeconds = row.elapsed_max_seconds ?: 0,
                ingredientFacts = ingredientFacts[row.id].orEmpty().associate {
                    it.ingredient_id to graphPresence(it.presence)
                },
                toolFacts = toolFacts[row.id].orEmpty().associate {
                    it.tool_id to graphPresence(it.presence)
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
            RecipeListItem(
                id = recipe.id,
                title = recipe.title,
                cooks = recipe.cooks,
                handsOnMinSeconds = recipe.handsOnMinSeconds,
                handsOnMaxSeconds = recipe.handsOnMaxSeconds,
                elapsedMinSeconds = recipe.elapsedMinSeconds,
                elapsedMaxSeconds = recipe.elapsedMaxSeconds,
                missingCount = hit.missingCount,
                dislikeHits = hit.dislikeHits,
            )
        }
    }

    suspend fun get(id: Long, query: SearchQuery): RecipeDetail {
        val recipe = recipes.recipe(id) ?: throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        val nodes = recipes.nodes(id)
        val summary = recipes.summaries().firstOrNull { it.id == id }
        val ingredientRows = recipes.nodeIngredients(id)
        val toolRows = recipes.nodeTools(id)
        val spanRows = recipes.spans(id)
        val edgeRows = recipes.edges(id)
        val ingredientAlts = recipes.ingredientAlts(id)
        val toolAlts = recipes.toolAlts(id)
        val timeHandsMin = summary?.hands_on_min_seconds ?: 0
        val timeHandsMax = summary?.hands_on_max_seconds ?: 0
        val timeElapsedMin = summary?.elapsed_min_seconds ?: 0
        val timeElapsedMax = summary?.elapsed_max_seconds ?: 0
        if (nodes.isEmpty()) {
            return RecipeDetail(
                id = recipe.id,
                title = recipe.title,
                cooks = recipe.cooks,
                handsOnMinSeconds = timeHandsMin,
                handsOnMaxSeconds = timeHandsMax,
                elapsedMinSeconds = timeElapsedMin,
                elapsedMaxSeconds = timeElapsedMax,
                nodes = emptyList(),
                edges = emptyList(),
                ingredientAlts = emptyList(),
                toolAlts = emptyList(),
                ingredientFacts = emptyList(),
                toolFacts = emptyList(),
                parallelPairs = emptyList(),
                avoidNodeIds = emptyList(),
            )
        }
        val analysis = try {
            analyze(storedGraph(recipe.cooks, nodes, edgeRows, spanRows, ingredientRows, toolRows))
        } catch (failure: GraphFailure) {
            throw ApiException(HttpStatusCode.BadRequest, failure.errors)
        }
        val allergens = catalog.allergensByIngredient().mapValues { (_, ids) -> ids.toSet() }
        val searchRecipe = SearchRecipe(
            id = recipe.id,
            title = recipe.title,
            cooks = recipe.cooks,
            handsOnMinSeconds = timeHandsMin,
            handsOnMaxSeconds = timeHandsMax,
            elapsedMinSeconds = timeElapsedMin,
            elapsedMaxSeconds = timeElapsedMax,
            ingredientFacts = analysis.ingredientFacts,
            toolFacts = analysis.toolFacts,
            ingredientAlts = ingredientAlts.map { SearchAlt(it.ingredient_id, it.alt_ingredient_id) },
            toolAlts = toolAlts.map { SearchToolAlt(it.tool_id, it.alt_tool_id) },
            allergensByIngredient = allergens,
        )
        val avoid = avoidNodes(analysis.alternatives, searchRecipe, query).map { it.toLong() }.sorted()
        return RecipeDetail(
            id = recipe.id,
            title = recipe.title,
            cooks = recipe.cooks,
            handsOnMinSeconds = timeHandsMin,
            handsOnMaxSeconds = timeHandsMax,
            elapsedMinSeconds = timeElapsedMin,
            elapsedMaxSeconds = timeElapsedMax,
            nodes = nodes.map { node ->
                val ingredients = ingredientRows.filter { it.node_id == node.id }
                val tools = toolRows.filter { it.node_id == node.id }
                NodeResponse(
                    id = node.id,
                    title = node.title,
                    body = node.body,
                    branchMode = gate(node.branch_mode),
                    joinMode = gate(node.join_mode),
                    repeatMin = node.repeat_min,
                    repeatMax = node.repeat_max,
                    ord = node.ord,
                    spans = spanRows.filter { it.node_id == node.id }.map {
                        SpanResponse(ord = it.ord, kind = spanKind(it.kind), seconds = it.seconds)
                    },
                    ingredients = ingredients.map {
                        NodeIngredientResponse(it.ingredient_id, it.slug, it.qty, it.unit, it.optional)
                    },
                    ingredientMap = ingredients.associate { row ->
                        row.slug to IngredientUse(row.ingredient_id, row.qty, row.unit, row.optional)
                    },
                    tools = tools.map {
                        NodeToolResponse(it.tool_id, it.slug, it.optional, toolHold(it.hold))
                    },
                )
            },
            edges = edgeRows.map { EdgeResponse(it.from_node_id, it.to_node_id, it.label) },
            ingredientAlts = ingredientAlts.map {
                IngredientAltResponse(it.ingredient_id, it.alt_ingredient_id, it.node_id, it.ratio, it.note)
            },
            toolAlts = toolAlts.map {
                ToolAltResponse(it.tool_id, it.alt_tool_id, it.node_id, it.note)
            },
            ingredientFacts = recipes.ingredientFacts(id).map {
                IngredientFactResponse(it.ingredient_id, presence(it.presence))
            },
            toolFacts = recipes.toolFacts(id).map {
                ToolFactResponse(it.tool_id, presence(it.presence))
            },
            parallelPairs = analysis.parallelPairs.map { (left, right) ->
                ParallelPair(left.toLong(), right.toLong())
            }.sortedWith(compareBy({ it.nodeId }, { it.otherNodeId })),
            avoidNodeIds = avoid,
        )
    }

    suspend fun create(write: RecipeWrite): RecipeDetail {
        val analysis = prepare(write)
        val id = recipes.insert(write, analysis)
        return get(id, SearchQuery())
    }

    suspend fun update(id: Long, write: RecipeWrite): RecipeDetail {
        if (recipes.recipe(id) == null) throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
        val analysis = prepare(write)
        recipes.replace(id, write, analysis)
        return get(id, SearchQuery())
    }

    suspend fun delete(id: Long) {
        if (!recipes.delete(id)) throw ApiException(HttpStatusCode.NotFound, listOf("recipe not found"))
    }

    private suspend fun prepare(write: RecipeWrite): Analysis {
        val errors = mutableListOf<String>()
        if (write.title.isBlank()) errors += "title must not be blank"
        if (write.nodes.any { it.title.isBlank() }) errors += "step title must not be blank"
        if (write.nodes.any { node -> node.ingredients.any { it.qty != null && it.qty < 0.0 } }) {
            errors += "ingredient qty must be >= 0"
        }
        val keys = write.nodes.map { it.key }.toSet()
        errors += altErrors(write.ingredientAlts, write.toolAlts, keys)
        val analysis = try {
            analyze(write.toGraph())
        } catch (failure: GraphFailure) {
            errors += failure.errors
            null
        }
        if (errors.isNotEmpty() || analysis == null) throw ApiException(HttpStatusCode.BadRequest, errors)
        val ingredientIds = write.nodes.flatMap { it.ingredients.map { ingredient -> ingredient.ingredientId } }.toSet() +
            write.ingredientAlts.flatMap { listOf(it.ingredientId, it.altIngredientId) }
        val toolIds = write.nodes.flatMap { it.tools.map { tool -> tool.toolId } }.toSet() +
            write.toolAlts.flatMap { listOf(it.toolId, it.altToolId) }
        unknownIds("ingredient", ingredientIds, catalog.ingredientIds())
        unknownIds("tool", toolIds, catalog.toolIds())
        return analysis
    }
}

private fun altErrors(
    ingredientAlts: List<IngredientAltWrite>,
    toolAlts: List<ToolAltWrite>,
    keys: Set<String>,
): List<String> {
    val errors = mutableListOf<String>()
    val ingredientPairs = ingredientAlts.map { Triple(it.ingredientId, it.altIngredientId, it.nodeKey) }
    if (ingredientPairs.size != ingredientPairs.toSet().size) errors += "ingredient alternatives must be unique"
    for (alt in ingredientAlts) {
        if (alt.ingredientId == alt.altIngredientId) errors += "an ingredient cannot replace itself"
        if (alt.ratio <= 0.0) errors += "ratio must be > 0"
        if (alt.nodeKey != null && alt.nodeKey !in keys) errors += "unknown step ${alt.nodeKey}"
    }
    val toolPairs = toolAlts.map { Triple(it.toolId, it.altToolId, it.nodeKey) }
    if (toolPairs.size != toolPairs.toSet().size) errors += "tool alternatives must be unique"
    for (alt in toolAlts) {
        if (alt.toolId == alt.altToolId) errors += "a tool cannot replace itself"
        if (alt.nodeKey != null && alt.nodeKey !in keys) errors += "unknown step ${alt.nodeKey}"
    }
    return errors
}

private fun RecipeWrite.toGraph() = InputGraph(
    cooks = cooks,
    nodes = nodes.map { node ->
        InputNode(
            key = node.key,
            branch = node.branchMode.toGraph(),
            join = node.joinMode.toGraph(),
            repeatMin = node.repeatMin,
            repeatMax = node.repeatMax,
            spans = node.spans.map { InputSpan(it.ord, it.kind.toGraph(), it.seconds) },
            ingredients = node.ingredients.map { InputIngredient(it.ingredientId, it.optional) },
            tools = node.tools.map { InputTool(it.toolId, it.optional, it.hold.toGraph()) },
        )
    },
    edges = edges.map { InputEdge(it.from, it.to) },
)

private fun storedGraph(
    cooks: Int,
    nodes: List<com.bieniucieniu.cookbook.db.Recipe_nodes>,
    edges: List<com.bieniucieniu.cookbook.db.Recipe_edges>,
    spans: List<com.bieniucieniu.cookbook.db.Recipe_node_spans>,
    ingredients: List<com.bieniucieniu.cookbook.db.SelectNodeIngredients>,
    tools: List<com.bieniucieniu.cookbook.db.SelectNodeTools>,
) = InputGraph(
    cooks = cooks,
    nodes = nodes.map { node ->
        InputNode(
            key = node.id.toString(),
            branch = gate(node.branch_mode).toGraph(),
            join = gate(node.join_mode).toGraph(),
            repeatMin = node.repeat_min,
            repeatMax = node.repeat_max,
            spans = spans.filter { it.node_id == node.id }.map {
                InputSpan(it.ord, spanKind(it.kind).toGraph(), it.seconds)
            },
            ingredients = ingredients.filter { it.node_id == node.id }.map {
                InputIngredient(it.ingredient_id, it.optional)
            },
            tools = tools.filter { it.node_id == node.id }.map {
                InputTool(it.tool_id, it.optional, toolHold(it.hold).toGraph())
            },
        )
    },
    edges = edges.map { InputEdge(it.from_node_id.toString(), it.to_node_id.toString()) },
)

private fun GateMode.toGraph(): GraphGate = when (this) {
    GateMode.None -> GraphGate.None
    GateMode.And -> GraphGate.And
    GateMode.Xor -> GraphGate.Xor
}

private fun SpanKind.toGraph(): GraphSpan = when (this) {
    SpanKind.Active -> GraphSpan.Active
    SpanKind.Wait -> GraphSpan.Wait
}

private fun ToolHold.toGraph(): GraphHold = when (this) {
    ToolHold.Active -> GraphHold.Active
    ToolHold.Span -> GraphHold.Span
}

private fun gate(value: String): GateMode = when (value) {
    "and" -> GateMode.And
    "xor" -> GateMode.Xor
    else -> GateMode.None
}

private fun spanKind(value: String): SpanKind = when (value) {
    "wait" -> SpanKind.Wait
    else -> SpanKind.Active
}

private fun toolHold(value: String): ToolHold = when (value) {
    "span" -> ToolHold.Span
    else -> ToolHold.Active
}

private fun presence(value: String): Presence = when (value) {
    "some_paths" -> Presence.SomePaths
    else -> Presence.AllPaths
}

private fun graphPresence(value: String): GraphPresence = when (value) {
    "some_paths" -> GraphPresence.SomePaths
    else -> GraphPresence.AllPaths
}
