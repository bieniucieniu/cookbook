package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.Presence
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeSummary
import com.bieniucieniu.cookbook.features.recipes.domain.SummaryAmount
import com.bieniucieniu.cookbook.features.recipes.domain.SummaryIngredient
import com.bieniucieniu.cookbook.features.recipes.domain.SummaryIngredientSwap
import com.bieniucieniu.cookbook.features.recipes.domain.SummaryTool
import com.bieniucieniu.cookbook.features.recipes.domain.SummaryToolSwap

/**
 * The recipe-level lists, summed from the steps (docs/recipes.md). Amounts add up per unit.
 * Presence comes from the search facts; an item missing there (optional) counts as `some_paths`.
 */
fun summarize(
    nodes: List<NodeResponse>,
    ingredientFacts: Map<Long, Presence>,
    toolFacts: Map<Long, Presence>,
): RecipeSummary {
    val ordered = nodes.sortedWith(compareBy({ it.ord }, { it.id }))
    val ingredients = linkedMapOf<Long, MutableList<Pair<String, NodeIngredientResponse>>>()
    val tools = linkedMapOf<Long, MutableList<Pair<String, NodeToolResponse>>>()
    for (node in ordered) {
        for (use in node.ingredients) ingredients.getOrPut(use.ingredientId) { mutableListOf() } += node.key to use
        for (use in node.tools) tools.getOrPut(use.toolId) { mutableListOf() } += node.key to use
    }
    return RecipeSummary(
        ingredients = ingredients.map { (id, uses) ->
            val amounts = linkedMapOf<String?, Double?>()
            for ((_, use) in uses) {
                val unit = use.unit?.trim()?.ifEmpty { null }
                val current = amounts[unit]
                amounts[unit] = when {
                    use.qty == null -> current
                    current == null -> use.qty
                    else -> current + use.qty
                }
            }
            val swaps = linkedMapOf<Long, SummaryIngredientSwap>()
            for ((key, use) in uses) {
                for (alt in use.alts) {
                    val known = swaps[alt.altIngredientId]
                    swaps[alt.altIngredientId] = known?.copy(stepKeys = known.stepKeys + key)
                        ?: SummaryIngredientSwap(alt.altIngredientId, alt.slug, alt.ratio, alt.note, listOf(key))
                }
            }
            SummaryIngredient(
                ingredientId = id,
                slug = uses.first().second.slug,
                amounts = amounts.map { (unit, qty) -> SummaryAmount(qty, unit) },
                optional = uses.all { it.second.optional },
                presence = ingredientFacts[id] ?: Presence.SomePaths,
                stepKeys = uses.map { it.first }.distinct(),
                alts = swaps.values.toList(),
            )
        },
        tools = tools.map { (id, uses) ->
            val swaps = linkedMapOf<Long, SummaryToolSwap>()
            for ((key, use) in uses) {
                for (alt in use.alts) {
                    val known = swaps[alt.altToolId]
                    swaps[alt.altToolId] = known?.copy(stepKeys = known.stepKeys + key)
                        ?: SummaryToolSwap(alt.altToolId, alt.slug, alt.note, listOf(key))
                }
            }
            SummaryTool(
                toolId = id,
                slug = uses.first().second.slug,
                optional = uses.all { it.second.optional },
                presence = toolFacts[id] ?: Presence.SomePaths,
                stepKeys = uses.map { it.first }.distinct(),
                alts = swaps.values.toList(),
            )
        },
        stepCount = nodes.size,
    )
}

/**
 * Save-time rules for what a step uses. One item is either optional everywhere or required
 * everywhere. A swap is never the item itself, its ratio is positive, and it is listed once.
 */
fun stepItemErrors(nodes: List<NodeWrite>): List<String> {
    val errors = mutableListOf<String>()
    val title = { node: NodeWrite -> "\"${node.title.ifBlank { node.key }}\"" }
    fun <T> conflicts(label: String, uses: List<Pair<NodeWrite, T>>, id: (T) -> Long, optional: (T) -> Boolean) {
        for ((itemId, group) in uses.groupBy { id(it.second) }) {
            val loose = group.firstOrNull { optional(it.second) } ?: continue
            val strict = group.firstOrNull { !optional(it.second) } ?: continue
            errors += "$label $itemId is optional in ${title(loose.first)} and required in ${title(strict.first)}"
        }
    }
    conflicts("ingredient", nodes.flatMap { node -> node.ingredients.map { node to it } }, { it.ingredientId }, { it.optional })
    conflicts("tool", nodes.flatMap { node -> node.tools.map { node to it } }, { it.toolId }, { it.optional })
    for (node in nodes) {
        for (use in node.ingredients) {
            val ids = use.alts.map { it.altIngredientId }
            if (ids.size != ids.toSet().size) errors += "step ${node.key} lists a swap for ingredient ${use.ingredientId} twice"
            if (use.ingredientId in ids) errors += "an ingredient cannot replace itself"
            if (use.alts.any { it.ratio <= 0.0 }) errors += "ratio must be > 0"
        }
        for (use in node.tools) {
            val ids = use.alts.map { it.altToolId }
            if (ids.size != ids.toSet().size) errors += "step ${node.key} lists a swap for tool ${use.toolId} twice"
            if (use.toolId in ids) errors += "a tool cannot replace itself"
        }
    }
    return errors.distinct()
}
