package com.bieniucieniu.cookbook.features.recipes.graph

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RecipeGraphTest {
    @Test
    fun sauceAndToastOverlapTheSimmer() {
        val analysis = analyze(sauceAndToast())
        assertEquals(1500, analysis.time.elapsedMinSeconds)
        assertEquals(1500, analysis.time.elapsedMaxSeconds)
        assertEquals(780, analysis.time.handsOnMinSeconds)
        assertEquals(780, analysis.time.handsOnMaxSeconds)
        assertEquals(setOf("sauce" to "toast"), analysis.parallelPairs)
    }

    @Test
    fun twoCooksOverlapActiveWork() {
        val one = analyze(twoActiveArms(cooks = 1))
        val two = analyze(twoActiveArms(cooks = 2))
        assertEquals(200, one.time.elapsedMinSeconds)
        assertEquals(200, one.time.handsOnMinSeconds)
        assertEquals(100, two.time.elapsedMinSeconds)
        assertEquals(200, two.time.handsOnMinSeconds)
    }

    @Test
    fun spanHeldToolSerializesArms() {
        val analysis = analyze(twoOvenArms())
        assertEquals(120, analysis.time.elapsedMinSeconds)
        assertEquals(20, analysis.time.handsOnMinSeconds)
    }

    @Test
    fun xorKeepsMinAndMax() {
        val analysis = analyze(xorFinish())
        assertEquals(4, analysis.time.elapsedMinSeconds)
        assertEquals(6, analysis.time.elapsedMaxSeconds)
        assertEquals(1, analysis.time.handsOnMinSeconds)
        assertEquals(4, analysis.time.handsOnMaxSeconds)
        assertTrue(analysis.parallelPairs.isEmpty())
    }

    @Test
    fun repeatExpandsMinAndMax() {
        val analysis = analyze(
            InputGraph(
                cooks = 1,
                nodes = listOf(node("only", spans = listOf(InputSpan(0, SpanKind.Active, 10)), repeatMax = 2)),
                edges = emptyList(),
            ),
        )
        assertEquals(10, analysis.time.elapsedMinSeconds)
        assertEquals(20, analysis.time.elapsedMaxSeconds)
        assertEquals(10, analysis.time.handsOnMinSeconds)
        assertEquals(20, analysis.time.handsOnMaxSeconds)
    }

    @Test
    fun factsMarkSharedAndArmOnlyRequirements() {
        val analysis = analyze(workedRecipe())
        assertEquals(Presence.AllPaths, analysis.ingredientFacts[1])
        assertEquals(Presence.AllPaths, analysis.ingredientFacts[4])
        assertEquals(Presence.AllPaths, analysis.ingredientFacts[5])
        assertEquals(Presence.AllPaths, analysis.toolFacts[10])
        assertEquals(Presence.SomePaths, analysis.toolFacts[11])
        assertFalse(3 in analysis.ingredientFacts)
    }

    @Test
    fun optionalIngredientStaysOutOfFacts() {
        val analysis = analyze(
            InputGraph(
                cooks = 1,
                nodes = listOf(
                    node(
                        "only",
                        ingredients = listOf(InputIngredient(9, optional = true)),
                    ),
                ),
                edges = emptyList(),
            ),
        )
        assertTrue(analysis.ingredientFacts.isEmpty())
    }

    @Test
    fun rejectsACycleAndAMismatchedJoin() {
        val cycle = assertFailsWith<GraphFailure> {
            analyze(
                InputGraph(
                    cooks = 1,
                    nodes = listOf(node("a"), node("b")),
                    edges = listOf(InputEdge("a", "b"), InputEdge("b", "a")),
                ),
            )
        }
        assertTrue(cycle.errors.any { "cycle" in it })

        val mismatch = assertFailsWith<GraphFailure> {
            analyze(
                InputGraph(
                    cooks = 1,
                    nodes = listOf(
                        node("s", branch = GateMode.And),
                        node("a"),
                        node("b"),
                        node("j", join = GateMode.Xor),
                    ),
                    edges = listOf(
                        InputEdge("s", "a"),
                        InputEdge("s", "b"),
                        InputEdge("a", "j"),
                        InputEdge("b", "j"),
                    ),
                ),
            )
        }
        assertTrue(mismatch.errors.any { "joins" in it })
    }

    @Test
    fun rejectsAnEdgeThatEntersARegion() {
        val failure = assertFailsWith<GraphFailure> {
            analyze(
                InputGraph(
                    cooks = 1,
                    nodes = listOf(
                        node("q", branch = GateMode.And),
                        node("s", branch = GateMode.And),
                        node("a", join = GateMode.And),
                        node("b"),
                        node("j", join = GateMode.And),
                    ),
                    edges = listOf(
                        InputEdge("q", "s"),
                        InputEdge("q", "a"),
                        InputEdge("s", "a"),
                        InputEdge("s", "b"),
                        InputEdge("a", "j"),
                        InputEdge("b", "j"),
                    ),
                ),
            )
        }
        assertTrue(failure.errors.any { "enters" in it })
    }

    @Test
    fun postDominatorOfADiamondIsTheJoin() {
        val ipdom = immediatePostDominators(
            listOf("s", "a", "b", "j"),
            mapOf("s" to listOf("a", "b"), "a" to listOf("j"), "b" to listOf("j"), "j" to emptyList()),
            "j",
        )
        assertEquals("j", ipdom["s"])
        assertEquals("j", ipdom["a"])
        assertEquals("j", ipdom["b"])
    }

    @Test
    fun allergyHidesAllPathsUnlessARecipeAltIsSafe() {
        val wheat = recipe(1, mapOf(7L to Presence.AllPaths))
        val query = SearchQuery(excludeAllergenIds = setOf(3))
        assertTrue(hidden(wheat, query))

        val withAlt = wheat.copy(ingredientAlts = listOf(SearchAlt(7, 8)))
        assertFalse(hidden(withAlt, query))

        val armOnly = recipe(2, mapOf(7L to Presence.SomePaths))
        assertFalse(hidden(armOnly, query))
    }

    @Test
    fun pantryAndDislikeRankWithoutHiding() {
        val plain = recipe(1, mapOf(1L to Presence.AllPaths, 2L to Presence.SomePaths))
        val ownedAlt = plain.copy(id = 2, ingredientAlts = listOf(SearchAlt(1, 4)))
        val missingTool = plain.copy(id = 3, toolFacts = mapOf(9L to Presence.AllPaths))
        val query = SearchQuery(
            haveIngredientIds = setOf(4),
            dislikeIngredientIds = setOf(2),
        )
        val hits = search(listOf(plain, missingTool, ownedAlt), query)
        assertEquals(listOf(2L, 1L, 3L), hits.map { it.recipe.id })
        assertEquals(0, hits[0].missingCount)
        assertEquals(1, hits[1].missingCount)
        assertEquals(2, hits[2].missingCount)
        assertEquals(1, hits[1].dislikeHits)
    }

    @Test
    fun avoidNodesDropsTheBlockedArm() {
        val recipe = recipe(1, mapOf(7L to Presence.SomePaths))
        val alternatives = listOf(
            AltConfig(setOf("shared", "safe"), emptySet(), emptySet()),
            AltConfig(setOf("shared", "broil"), setOf(7), emptySet()),
        )
        assertEquals(setOf("broil"), avoidNodes(alternatives, recipe, SearchQuery(excludeIngredientIds = setOf(7))))
    }

    private fun sauceAndToast() = InputGraph(
        cooks = 1,
        nodes = listOf(
            node("prep", branch = GateMode.And),
            node(
                "sauce",
                spans = listOf(InputSpan(0, SpanKind.Active, 300), InputSpan(1, SpanKind.Wait, 1200)),
                tools = listOf(InputTool(10, optional = false, hold = ToolHold.Span)),
            ),
            node("toast", spans = listOf(InputSpan(0, SpanKind.Active, 480))),
            node("eggs", join = GateMode.And),
        ),
        edges = listOf(
            InputEdge("prep", "sauce"),
            InputEdge("prep", "toast"),
            InputEdge("sauce", "eggs"),
            InputEdge("toast", "eggs"),
        ),
    )

    private fun twoActiveArms(cooks: Int) = InputGraph(
        cooks = cooks,
        nodes = listOf(
            node("s", branch = GateMode.And),
            node("a", spans = listOf(InputSpan(0, SpanKind.Active, 100))),
            node("b", spans = listOf(InputSpan(0, SpanKind.Active, 100))),
            node("j", join = GateMode.And),
        ),
        edges = listOf(
            InputEdge("s", "a"),
            InputEdge("s", "b"),
            InputEdge("a", "j"),
            InputEdge("b", "j"),
        ),
    )

    private fun twoOvenArms() = InputGraph(
        cooks = 1,
        nodes = listOf(
            node("s", branch = GateMode.And),
            node(
                "a",
                spans = listOf(InputSpan(0, SpanKind.Active, 10), InputSpan(1, SpanKind.Wait, 100)),
                tools = listOf(InputTool(1, optional = false, hold = ToolHold.Span)),
            ),
            node(
                "b",
                spans = listOf(InputSpan(0, SpanKind.Active, 10)),
                tools = listOf(InputTool(1, optional = false, hold = ToolHold.Span)),
            ),
            node("j", join = GateMode.And),
        ),
        edges = listOf(
            InputEdge("s", "a"),
            InputEdge("s", "b"),
            InputEdge("a", "j"),
            InputEdge("b", "j"),
        ),
    )

    private fun xorFinish() = InputGraph(
        cooks = 1,
        nodes = listOf(
            node("start", branch = GateMode.Xor),
            node("pan", spans = listOf(InputSpan(0, SpanKind.Active, 4))),
            node("broil", spans = listOf(InputSpan(0, SpanKind.Active, 1), InputSpan(1, SpanKind.Wait, 5))),
            node("end", join = GateMode.Xor),
        ),
        edges = listOf(
            InputEdge("start", "pan"),
            InputEdge("start", "broil"),
            InputEdge("pan", "end"),
            InputEdge("broil", "end"),
        ),
    )

    private fun workedRecipe() = InputGraph(
        cooks = 1,
        nodes = listOf(
            node("prep", branch = GateMode.And),
            node(
                "sauce",
                ingredients = listOf(InputIngredient(1, false), InputIngredient(2, false), InputIngredient(3, true)),
                tools = listOf(InputTool(10, false, ToolHold.Span)),
            ),
            node("toast", ingredients = listOf(InputIngredient(4, false))),
            node("eggs", join = GateMode.And, branch = GateMode.Xor, ingredients = listOf(InputIngredient(5, false))),
            node("pan"),
            node("broil", tools = listOf(InputTool(11, false, ToolHold.Span))),
            node("serve", join = GateMode.Xor),
        ),
        edges = listOf(
            InputEdge("prep", "sauce"),
            InputEdge("prep", "toast"),
            InputEdge("sauce", "eggs"),
            InputEdge("toast", "eggs"),
            InputEdge("eggs", "pan"),
            InputEdge("eggs", "broil"),
            InputEdge("pan", "serve"),
            InputEdge("broil", "serve"),
        ),
    )

    private fun recipe(
        id: Long,
        ingredientFacts: Map<Long, Presence>,
        toolFacts: Map<Long, Presence> = emptyMap(),
    ) = SearchRecipe(
        id = id,
        title = "r$id",
        cooks = 1,
        handsOnMinSeconds = 0,
        handsOnMaxSeconds = 0,
        elapsedMinSeconds = 0,
        elapsedMaxSeconds = 0,
        ingredientFacts = ingredientFacts,
        toolFacts = toolFacts,
        ingredientAlts = emptyList(),
        toolAlts = emptyList(),
        allergensByIngredient = mapOf(7L to setOf(3L)),
    )
}

private fun node(
    key: String,
    branch: GateMode = GateMode.None,
    join: GateMode = GateMode.None,
    repeatMax: Int = 1,
    spans: List<InputSpan> = emptyList(),
    ingredients: List<InputIngredient> = emptyList(),
    tools: List<InputTool> = emptyList(),
) = InputNode(
    key = key,
    branch = branch,
    join = join,
    repeatMin = 1,
    repeatMax = repeatMax,
    spans = spans,
    ingredients = ingredients,
    tools = tools,
)
