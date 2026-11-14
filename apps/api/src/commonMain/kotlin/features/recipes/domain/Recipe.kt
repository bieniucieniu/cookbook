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

/** Another ingredient this step accepts instead. `ratio` is swap quantity / original quantity. */
@Serializable
data class IngredientSwapWrite(
    val altIngredientId: Long,
    val ratio: Double = 1.0,
    val note: String = "",
)

@Serializable
data class ToolSwapWrite(
    val altToolId: Long,
    val note: String = "",
)

@Serializable
data class NodeIngredientWrite(
    val ingredientId: Long,
    val qty: Double? = null,
    val unit: String? = null,
    val optional: Boolean = false,
    val alts: List<IngredientSwapWrite> = emptyList(),
)

@Serializable
data class NodeToolWrite(
    val toolId: Long,
    val optional: Boolean = false,
    val hold: ToolHold = ToolHold.Active,
    val alts: List<ToolSwapWrite> = emptyList(),
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
enum class RecipeVisibility {
    @SerialName("public") Public,
    @SerialName("private") Private,
}

@Serializable
enum class RecipePermission {
    @SerialName("read") Read,
    @SerialName("write") Write,
}

@Serializable
data class PhotoRef(val id: Long, val alt: String = "")

@Serializable
data class PhotoCreated(val id: Long, val url: String)

@Serializable
data class PhotoUpload(val file: String)

@Serializable
data class CommentWrite(val stepKey: String, val body: String)

@Serializable
data class CommentResponse(
    val id: Long,
    val stepKey: String,
    val userId: Long,
    val email: String,
    val body: String,
    val createdAt: Long,
)

@Serializable
data class RecipeWrite(
    val title: String,
    val description: String = "",
    val notes: String = "",
    val cooks: Int = 1,
    val visibility: RecipeVisibility = RecipeVisibility.Public,
    val nodes: List<NodeWrite>,
    val edges: List<EdgeWrite> = emptyList(),
    val photos: List<PhotoRef> = emptyList(),
)

@Serializable
data class RecipeGrant(
    val userId: Long,
    val email: String,
    val permission: RecipePermission,
)

@Serializable
data class GrantWrite(
    val email: String,
    val permission: RecipePermission,
)

@Serializable
data class IngredientUse(
    val id: Long,
    val qty: Double? = null,
    val unit: String? = null,
    val optional: Boolean = false,
)

@Serializable
data class IngredientSwapResponse(
    val altIngredientId: Long,
    val slug: String,
    val ratio: Double,
    val note: String,
)

@Serializable
data class ToolSwapResponse(
    val altToolId: Long,
    val slug: String,
    val note: String,
)

@Serializable
data class NodeIngredientResponse(
    val ingredientId: Long,
    val slug: String,
    val qty: Double? = null,
    val unit: String? = null,
    val optional: Boolean = false,
    val alts: List<IngredientSwapResponse> = emptyList(),
)

@Serializable
data class NodeToolResponse(
    val toolId: Long,
    val slug: String,
    val optional: Boolean = false,
    val hold: ToolHold = ToolHold.Active,
    val alts: List<ToolSwapResponse> = emptyList(),
)

@Serializable
data class SpanResponse(val ord: Int, val kind: SpanKind, val seconds: Int)

@Serializable
data class NodeResponse(
    val id: Long,
    val key: String,
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

/** One summed amount. Uses with no quantity add nothing; `qty` stays null when no use had one. */
@Serializable
data class SummaryAmount(val qty: Double? = null, val unit: String? = null)

@Serializable
data class SummaryIngredientSwap(
    val altIngredientId: Long,
    val slug: String,
    val ratio: Double,
    val note: String,
    val stepKeys: List<String>,
)

@Serializable
data class SummaryToolSwap(
    val altToolId: Long,
    val slug: String,
    val note: String,
    val stepKeys: List<String>,
)

@Serializable
data class SummaryIngredient(
    val ingredientId: Long,
    val slug: String,
    val amounts: List<SummaryAmount>,
    val optional: Boolean,
    val presence: Presence,
    val stepKeys: List<String>,
    val alts: List<SummaryIngredientSwap>,
)

@Serializable
data class SummaryTool(
    val toolId: Long,
    val slug: String,
    val optional: Boolean,
    val presence: Presence,
    val stepKeys: List<String>,
    val alts: List<SummaryToolSwap>,
)

/** The recipe-level lists. Only a sum of the steps; nothing here is stored on its own. */
@Serializable
data class RecipeSummary(
    val ingredients: List<SummaryIngredient>,
    val tools: List<SummaryTool>,
    val stepCount: Int,
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
    val ownerId: Long?,
    val visibility: RecipeVisibility,
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
    val description: String,
    val notes: String,
    val cooks: Int,
    val ownerId: Long?,
    val visibility: RecipeVisibility,
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
    val nodes: List<NodeResponse>,
    val edges: List<EdgeResponse>,
    val summary: RecipeSummary,
    val ingredientFacts: List<IngredientFactResponse>,
    val toolFacts: List<ToolFactResponse>,
    val parallelPairs: List<ParallelPair>,
    val avoidNodeIds: List<Long> = emptyList(),
    val photos: List<PhotoRef> = emptyList(),
    val comments: List<CommentResponse> = emptyList(),
)
