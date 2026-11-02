package com.bieniucieniu.cookbook.features.mcp

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

internal const val RECIPE_HELP =
    "nodes[].body is the step method. Step notes are comments, not a node field. Do not send photos; images stay a browser upload. One start step and one end step. branchMode and joinMode are none when that side has at most one edge, otherwise and or xor."

private fun enumSchema(vararg values: String, description: String? = null): JsonObject = buildJsonObject {
    put("type", "string")
    put("enum", buildJsonArray { values.forEach { add(JsonPrimitive(it)) } })
    if (description != null) put("description", description)
}

private fun stringSchema(description: String? = null): JsonObject = buildJsonObject {
    put("type", "string")
    if (description != null) put("description", description)
}

private fun intSchema(description: String? = null, minimum: Int? = null): JsonObject = buildJsonObject {
    put("type", "integer")
    if (minimum != null) put("minimum", minimum)
    if (description != null) put("description", description)
}

private fun numberSchema(description: String? = null, minimum: Int? = null): JsonObject = buildJsonObject {
    put("type", "number")
    if (minimum != null) put("minimum", minimum)
    if (description != null) put("description", description)
}

private fun obj(properties: JsonObject, required: List<String> = emptyList()): JsonObject = buildJsonObject {
    put("type", "object")
    put("properties", properties)
    if (required.isNotEmpty()) {
        put("required", buildJsonArray { required.forEach { add(JsonPrimitive(it)) } })
    }
}

private fun props(vararg pairs: Pair<String, JsonObject>): JsonObject = JsonObject(mapOf(*pairs))

internal fun emptyInputSchema(): JsonObject = obj(JsonObject(emptyMap()))

internal fun namedInputSchema(): JsonObject = obj(
    props(
        "slug" to stringSchema("Lowercase words joined by hyphens"),
        "name" to stringSchema(),
    ),
    required = listOf("slug", "name"),
)

internal fun recipeIdInputSchema(): JsonObject = obj(
    props("recipeId" to intSchema("Recipe id", minimum = 1)),
    required = listOf("recipeId"),
)

internal fun commentInputSchema(): JsonObject = obj(
    props(
        "recipeId" to intSchema("Recipe id", minimum = 1),
        "stepKey" to stringSchema("Node key on the recipe"),
        "body" to stringSchema(),
    ),
    required = listOf("recipeId", "stepKey", "body"),
)

private fun spanSchema(): JsonObject = obj(
    props(
        "ord" to intSchema(minimum = 0),
        "kind" to enumSchema("active", "wait"),
        "seconds" to intSchema(minimum = 0),
    ),
    required = listOf("ord", "kind", "seconds"),
)

private fun nodeSchema(): JsonObject = obj(
    props(
        "key" to stringSchema("Stable step key. Comments use this key"),
        "title" to stringSchema(),
        "body" to stringSchema("Step method. Not notes"),
        "branchMode" to enumSchema(
            "none",
            "and",
            "xor",
            description = "none with 0 or 1 outgoing edge; and or xor when there are more",
        ),
        "joinMode" to enumSchema(
            "none",
            "and",
            "xor",
            description = "none with 0 or 1 incoming edge; and or xor when there are more",
        ),
        "repeatMin" to intSchema(minimum = 1),
        "repeatMax" to intSchema(minimum = 1),
        "ord" to intSchema(minimum = 0),
        "spans" to buildJsonObject {
            put("type", "array")
            put("items", spanSchema())
        },
        "ingredients" to buildJsonObject {
            put("type", "array")
            put("items", obj(
                props(
                    "ingredientId" to intSchema("Catalog ingredient id", minimum = 1),
                    "qty" to numberSchema(minimum = 0),
                    "unit" to stringSchema(),
                    "optional" to buildJsonObject { put("type", "boolean") },
                ),
                required = listOf("ingredientId"),
            ))
        },
        "tools" to buildJsonObject {
            put("type", "array")
            put("items", obj(
                props(
                    "toolId" to intSchema("Catalog tool id", minimum = 1),
                    "optional" to buildJsonObject { put("type", "boolean") },
                    "hold" to enumSchema("active", "span", description = "active during the step, or span for the timed span"),
                ),
                required = listOf("toolId"),
            ))
        },
    ),
    required = listOf("key", "title"),
)

private fun edgeSchema(): JsonObject = obj(
    props(
        "from" to stringSchema(),
        "to" to stringSchema(),
        "label" to stringSchema(),
    ),
    required = listOf("from", "to"),
)

private fun ingredientAltSchema(): JsonObject = obj(
    props(
        "ingredientId" to intSchema(minimum = 1),
        "altIngredientId" to intSchema(minimum = 1),
        "nodeKey" to stringSchema("Null applies to the whole recipe"),
        "ratio" to numberSchema(minimum = 0),
        "note" to stringSchema(),
    ),
    required = listOf("ingredientId", "altIngredientId"),
)

private fun toolAltSchema(): JsonObject = obj(
    props(
        "toolId" to intSchema(minimum = 1),
        "altToolId" to intSchema(minimum = 1),
        "nodeKey" to stringSchema("Null applies to the whole recipe"),
        "note" to stringSchema(),
    ),
    required = listOf("toolId", "altToolId"),
)

internal fun recipeInputSchema(includeRecipeId: Boolean): JsonObject {
    val fields = mutableListOf<Pair<String, JsonObject>>()
    val required = mutableListOf("title", "nodes")
    if (includeRecipeId) {
        fields += "recipeId" to intSchema("Recipe id", minimum = 1)
        required += "recipeId"
    }
    fields += listOf(
        "title" to stringSchema(),
        "description" to stringSchema("Method intro"),
        "notes" to stringSchema("Cook's notes for the whole recipe. Not a thread"),
        "cooks" to intSchema(minimum = 1),
        "visibility" to enumSchema("public", "private"),
        "nodes" to buildJsonObject {
            put("type", "array")
            put("minItems", 1)
            put("items", nodeSchema())
        },
        "edges" to buildJsonObject {
            put("type", "array")
            put("items", edgeSchema())
        },
        "ingredientAlts" to buildJsonObject {
            put("type", "array")
            put("items", ingredientAltSchema())
        },
        "toolAlts" to buildJsonObject {
            put("type", "array")
            put("items", toolAltSchema())
        },
    )
    return obj(JsonObject(fields.toMap()), required)
}

internal fun toolDefinition(
    name: String,
    description: String,
    schema: JsonObject,
    readOnly: Boolean = false,
    destructive: Boolean = false,
    idempotent: Boolean = false,
): JsonObject = buildJsonObject {
    put("name", name)
    put("description", description)
    put("inputSchema", schema)
    put("annotations", buildJsonObject {
        if (readOnly) put("readOnlyHint", true)
        if (destructive) put("destructiveHint", true)
        if (idempotent) put("idempotentHint", true)
        put("openWorldHint", true)
    })
}
