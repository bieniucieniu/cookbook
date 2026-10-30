package com.bieniucieniu.cookbook.features.recipes.graph

data class SearchQuery(
    val excludeIngredientIds: Set<Long> = emptySet(),
    val excludeAllergenIds: Set<Long> = emptySet(),
    val haveIngredientIds: Set<Long> = emptySet(),
    val haveToolIds: Set<Long> = emptySet(),
    val dislikeIngredientIds: Set<Long> = emptySet(),
) {
    val hasExclusions: Boolean
        get() = excludeIngredientIds.isNotEmpty() || excludeAllergenIds.isNotEmpty()
}

data class SearchAlt(val ingredientId: Long, val altIngredientId: Long)

data class SearchToolAlt(val toolId: Long, val altToolId: Long)

data class SearchRecipe(
    val id: Long,
    val title: String,
    val cooks: Int,
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
    val ingredientFacts: Map<Long, Presence>,
    val toolFacts: Map<Long, Presence>,
    val ingredientAlts: List<SearchAlt>,
    val toolAlts: List<SearchToolAlt>,
    val allergensByIngredient: Map<Long, Set<Long>>,
)

data class SearchHit(
    val recipe: SearchRecipe,
    val missingCount: Int,
    val dislikeHits: Int,
)

fun search(recipes: List<SearchRecipe>, query: SearchQuery): List<SearchHit> =
    recipes.mapNotNull { recipe ->
        if (hidden(recipe, query)) return@mapNotNull null
        SearchHit(
            recipe = recipe,
            missingCount = missingCount(recipe, query),
            dislikeHits = recipe.ingredientFacts.keys.count { it in query.dislikeIngredientIds },
        )
    }.sortedWith(compareBy({ it.missingCount }, { it.dislikeHits }, { it.recipe.id }))

fun hidden(recipe: SearchRecipe, query: SearchQuery): Boolean {
    if (!query.hasExclusions) return false
    return recipe.ingredientFacts.any { (id, presence) ->
        presence == Presence.AllPaths && hardHit(recipe, id, query) && !cleared(recipe, id, query)
    }
}

fun avoidNodes(alternatives: List<AltConfig>, recipe: SearchRecipe, query: SearchQuery): Set<String> {
    if (!query.hasExclusions) return emptySet()
    val viable = alternatives.filter { config ->
        config.ingredients.none { id -> hardHit(recipe, id, query) && !cleared(recipe, id, query) }
    }
    val all = alternatives.flatMap { it.nodes }.toSet()
    if (viable.isEmpty()) return all
    val kept = viable.flatMap { it.nodes }.toSet()
    return all - kept
}

private fun hardHit(recipe: SearchRecipe, ingredientId: Long, query: SearchQuery): Boolean {
    if (ingredientId in query.excludeIngredientIds) return true
    val allergens = recipe.allergensByIngredient[ingredientId].orEmpty()
    return allergens.any { it in query.excludeAllergenIds }
}

private fun cleared(recipe: SearchRecipe, ingredientId: Long, query: SearchQuery): Boolean =
    recipe.ingredientAlts.any { alt ->
        alt.ingredientId == ingredientId && !hardHit(recipe, alt.altIngredientId, query)
    }

private fun missingCount(recipe: SearchRecipe, query: SearchQuery): Int {
    val ingredients = recipe.ingredientFacts.count { (id, presence) ->
        presence == Presence.AllPaths &&
            id !in query.haveIngredientIds &&
            recipe.ingredientAlts.none { it.ingredientId == id && it.altIngredientId in query.haveIngredientIds }
    }
    val tools = recipe.toolFacts.count { (id, presence) ->
        presence == Presence.AllPaths &&
            id !in query.haveToolIds &&
            recipe.toolAlts.none { it.toolId == id && it.altToolId in query.haveToolIds }
    }
    return ingredients + tools
}
