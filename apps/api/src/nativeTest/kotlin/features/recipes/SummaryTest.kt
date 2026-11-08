package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.recipes.domain.GateMode
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientSwapResponse
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientSwapWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolResponse
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.Presence
import com.bieniucieniu.cookbook.features.recipes.domain.SummaryAmount
import com.bieniucieniu.cookbook.features.recipes.domain.ToolSwapWrite
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class SummaryTest {
    @Test
    fun amountsAddUpPerUnitAndSwapsMerge() {
        val butter = { qty: Double?, unit: String?, swap: Boolean ->
            NodeIngredientResponse(
                ingredientId = 1,
                slug = "butter",
                qty = qty,
                unit = unit,
                alts = if (swap) listOf(IngredientSwapResponse(2, "oil", 0.8, "")) else emptyList(),
            )
        }
        val nodes = listOf(
            node(1, "fry", 1, ingredients = listOf(butter(20.0, "g", true))),
            node(2, "melt", 0, ingredients = listOf(butter(30.0, "g", true))),
            node(3, "finish", 2, ingredients = listOf(butter(1.0, "tbsp", false)), tools = listOf(NodeToolResponse(5, "pan"))),
            node(4, "garnish", 3, ingredients = listOf(butter(null, null, false))),
        )
        val summary = summarize(nodes, mapOf(1L to Presence.AllPaths), emptyMap())
        val line = summary.ingredients.single()
        assertEquals(listOf(SummaryAmount(50.0, "g"), SummaryAmount(1.0, "tbsp"), SummaryAmount(null, null)), line.amounts)
        assertEquals(listOf("melt", "fry", "finish", "garnish"), line.stepKeys)
        assertEquals(listOf("melt", "fry"), line.alts.single().stepKeys)
        assertEquals(Presence.AllPaths, line.presence)
        assertEquals(Presence.SomePaths, summary.tools.single().presence)
        assertEquals(4, summary.stepCount)
    }

    @Test
    fun optionalInOneStepAndRequiredInAnotherIsRejected() {
        val errors = stepItemErrors(
            listOf(
                write("a", ingredients = listOf(NodeIngredientWrite(1, optional = true))),
                write("b", ingredients = listOf(NodeIngredientWrite(1, optional = false))),
                write("c", tools = listOf(NodeToolWrite(9, optional = false))),
                write("d", tools = listOf(NodeToolWrite(9, optional = true))),
            ),
        )
        assertEquals(
            listOf(
                "ingredient 1 is optional in \"a\" and required in \"b\"",
                "tool 9 is optional in \"d\" and required in \"c\"",
            ),
            errors,
        )
    }

    @Test
    fun sameOptionalEverywhereIsFine() {
        val errors = stepItemErrors(
            listOf(
                write("a", ingredients = listOf(NodeIngredientWrite(1, optional = true))),
                write("b", ingredients = listOf(NodeIngredientWrite(1, optional = true))),
            ),
        )
        assertTrue(errors.isEmpty())
    }

    @Test
    fun badSwapsAreRejected() {
        val errors = stepItemErrors(
            listOf(
                write(
                    "a",
                    ingredients = listOf(
                        NodeIngredientWrite(1, alts = listOf(IngredientSwapWrite(1), IngredientSwapWrite(2, ratio = 0.0))),
                        NodeIngredientWrite(3, alts = listOf(IngredientSwapWrite(4), IngredientSwapWrite(4))),
                    ),
                    tools = listOf(NodeToolWrite(5, alts = listOf(ToolSwapWrite(5)))),
                ),
            ),
        )
        assertEquals(
            listOf(
                "an ingredient cannot replace itself",
                "ratio must be > 0",
                "step a lists a swap for ingredient 3 twice",
                "a tool cannot replace itself",
            ),
            errors,
        )
    }

    private fun node(
        id: Long,
        key: String,
        ord: Int,
        ingredients: List<NodeIngredientResponse> = emptyList(),
        tools: List<NodeToolResponse> = emptyList(),
    ) = NodeResponse(
        id = id,
        key = key,
        title = key,
        body = "",
        branchMode = GateMode.None,
        joinMode = GateMode.None,
        repeatMin = 1,
        repeatMax = 1,
        ord = ord,
        spans = emptyList(),
        ingredients = ingredients,
        ingredientMap = emptyMap(),
        tools = tools,
    )

    private fun write(
        key: String,
        ingredients: List<NodeIngredientWrite> = emptyList(),
        tools: List<NodeToolWrite> = emptyList(),
    ) = NodeWrite(key = key, title = key, ingredients = ingredients, tools = tools)
}
