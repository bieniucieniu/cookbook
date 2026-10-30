package com.bieniucieniu.cookbook.features.recipes.domain

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class GateMode {
    @SerialName("none") None,
    @SerialName("and") And,
    @SerialName("xor") Xor,
}

@Serializable
enum class SpanKind {
    @SerialName("active") Active,
    @SerialName("wait") Wait,
}

@Serializable
enum class ToolHold {
    @SerialName("active") Active,
    @SerialName("span") Span,
}

@Serializable
enum class Presence {
    @SerialName("all_paths") AllPaths,
    @SerialName("some_paths") SomePaths,
}

@Serializable
data class SpanWrite(val ord: Int, val kind: SpanKind, val seconds: Int)

@Serializable
data class NodeIngredientWrite(
    val ingredientId: Long,
    val qty: Double? = null,
    val unit: String? = null,
    val optional: Boolean = false,
)

@Serializable
data class NodeToolWrite(
    val toolId: Long,
    val optional: Boolean = false,
    val hold: ToolHold = ToolHold.Active,
)

@Serializable
data class NodeWrite(
    val key: String,
    val title: String,
    val body: String = "",
    val branchMode: GateMode = GateMode.None,
    val joinMode: GateMode = GateMode.None,
    val repeatMin: Int = 1,
    val repeatMax: Int = 1,
    val ord: Int = 0,
    val spans: List<SpanWrite> = emptyList(),
    val ingredients: List<NodeIngredientWrite> = emptyList(),
    val tools: List<NodeToolWrite> = emptyList(),
)

@Serializable
data class EdgeWrite(val from: String, val to: String, val label: String = "")

@Serializable
data class IngredientAltWrite(
    val ingredientId: Long,
    val altIngredientId: Long,
    val nodeKey: String? = null,
    val ratio: Double = 1.0,
    val note: String = "",
)

@Serializable
data class ToolAltWrite(
    val toolId: Long,
    val altToolId: Long,
    val nodeKey: String? = null,
    val note: String = "",
)

@Serializable
data class RecipeWrite(
    val title: String,
    val cooks: Int = 1,
    val nodes: List<NodeWrite>,
    val edges: List<EdgeWrite> = emptyList(),
    val ingredientAlts: List<IngredientAltWrite> = emptyList(),
    val toolAlts: List<ToolAltWrite> = emptyList(),
)

@Serializable
data class IngredientUse(
    val id: Long,
    val qty: Double? = null,
    val unit: String? = null,
    val optional: Boolean = false,
)

@Serializable
data class NodeIngredientResponse(
    val ingredientId: Long,
    val slug: String,
    val qty: Double? = null,
    val unit: String? = null,
    val optional: Boolean = false,
)

@Serializable
data class NodeToolResponse(
    val toolId: Long,
    val slug: String,
    val optional: Boolean = false,
    val hold: ToolHold = ToolHold.Active,
)

@Serializable
data class SpanResponse(val ord: Int, val kind: SpanKind, val seconds: Int)

@Serializable
data class NodeResponse(
    val id: Long,
    val title: String,
    val body: String,
    val branchMode: GateMode,
    val joinMode: GateMode,
    val repeatMin: Int,
    val repeatMax: Int,
    val ord: Int,
    val spans: List<SpanResponse>,
    val ingredients: List<NodeIngredientResponse>,
    val ingredientMap: Map<String, IngredientUse>,
    val tools: List<NodeToolResponse>,
)

@Serializable
data class EdgeResponse(val fromNodeId: Long, val toNodeId: Long, val label: String)

@Serializable
data class IngredientAltResponse(
    val ingredientId: Long,
    val altIngredientId: Long,
    val nodeId: Long? = null,
    val ratio: Double,
    val note: String,
)

@Serializable
data class ToolAltResponse(
    val toolId: Long,
    val altToolId: Long,
    val nodeId: Long? = null,
    val note: String,
)

@Serializable
data class IngredientFactResponse(val ingredientId: Long, val presence: Presence)

@Serializable
data class ToolFactResponse(val toolId: Long, val presence: Presence)

@Serializable
data class ParallelPair(val nodeId: Long, val otherNodeId: Long)

@Serializable
data class RecipeListItem(
    val id: Long,
    val title: String,
    val cooks: Int,
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
    val missingCount: Int,
    val dislikeHits: Int,
)

@Serializable
data class RecipeDetail(
    val id: Long,
    val title: String,
    val cooks: Int,
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
    val nodes: List<NodeResponse>,
    val edges: List<EdgeResponse>,
    val ingredientAlts: List<IngredientAltResponse>,
    val toolAlts: List<ToolAltResponse>,
    val ingredientFacts: List<IngredientFactResponse>,
    val toolFacts: List<ToolFactResponse>,
    val parallelPairs: List<ParallelPair>,
    val avoidNodeIds: List<Long> = emptyList(),
)
