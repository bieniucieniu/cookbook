package com.bieniucieniu.cookbook.features.mcp

import com.bieniucieniu.cookbook.core.http.ErrorBody
import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.AuthConfig
import com.bieniucieniu.cookbook.features.auth.AuthRepository
import com.bieniucieniu.cookbook.features.auth.OptionalWorkOS
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.header
import io.ktor.server.request.receiveText
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.openapi.hide
import io.ktor.server.routing.route
import io.ktor.utils.io.ExperimentalKtorApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import org.koin.dsl.module
import org.koin.ktor.ext.inject

private val rpcJson = Json { ignoreUnknownKeys = true }

val mcpModule = module {
    single {
        val users = get<AuthRepository>()
        McpAuth(
            config = get(),
            http = get(),
            workos = get<OptionalWorkOS>().client,
            accounts = McpAccounts { id, email, first, last ->
                Actor(users.upsertUser(id, email, first, last).id)
            },
        )
    }
    single<McpCatalog> { CatalogMcp(get()) }
    single<McpRecipes> { RecipeMcp(get()) }
    single { McpTools(get(), get()) }
}

@OptIn(ExperimentalKtorApi::class)
fun Route.configureMcpRouting() {
    val auth: McpAuth by inject()
    val tools: McpTools by inject()
    val config: AuthConfig by inject()

    get("/.well-known/oauth-protected-resource") {
        if (!config.mcpConfigured) {
            call.respond(HttpStatusCode.ServiceUnavailable, ErrorBody(listOf("workos is not configured")))
            return@get
        }
        if (!originAllowed(call, config.mcpResourceUrl)) return@get
        call.respond(auth.protectedResource())
    }.hide()

    get("/.well-known/oauth-authorization-server") {
        if (!config.mcpConfigured) {
            call.respond(HttpStatusCode.ServiceUnavailable, ErrorBody(listOf("workos is not configured")))
            return@get
        }
        if (!originAllowed(call, config.mcpResourceUrl)) return@get
        val metadata = auth.authorizationServerMetadata()
        if (metadata == null) {
            call.respond(HttpStatusCode.BadGateway, ErrorBody(listOf("authorization server metadata unavailable")))
            return@get
        }
        call.respondText(metadata, ContentType.Application.Json)
    }.hide()

    route("/mcp") {
        post {
            if (!config.mcpConfigured) {
                call.respond(HttpStatusCode.ServiceUnavailable, ErrorBody(listOf("workos is not configured")))
                return@post
            }
            if (!originAllowed(call, config.mcpResourceUrl)) return@post
            when (val gate = auth.gate(call.request.header(HttpHeaders.Authorization))) {
                McpGate.Unconfigured ->
                    call.respond(HttpStatusCode.ServiceUnavailable, ErrorBody(listOf("workos is not configured")))
                McpGate.Denied -> {
                    call.response.header(HttpHeaders.WWWAuthenticate, auth.challenge())
                    call.respond(HttpStatusCode.Unauthorized, ErrorBody(listOf("Authorization needed")))
                }
                is McpGate.Ready -> dispatch(call, tools, gate.actor)
            }
        }.hide()
    }.hide()
}

private suspend fun originAllowed(call: ApplicationCall, resourceUrl: String): Boolean {
    val origin = call.request.header(HttpHeaders.Origin)
    if (origin.isNullOrBlank()) return true
    if (origin.trimEnd('/') == resourceOrigin(resourceUrl)) return true
    call.respond(HttpStatusCode.Forbidden, ErrorBody(listOf("origin rejected")))
    return false
}

private suspend fun dispatch(call: ApplicationCall, tools: McpTools, actor: Actor) {
    val text = try {
        call.receiveText()
    } catch (_: Throwable) {
        call.respond(HttpStatusCode.BadRequest, rpcError(null, -32700, "parse error"))
        return
    }
    val message = try {
        rpcJson.parseToJsonElement(text) as? JsonObject
    } catch (_: Throwable) {
        null
    }
    if (message == null) {
        call.respond(HttpStatusCode.BadRequest, rpcError(null, -32700, "parse error"))
        return
    }
    val id = message["id"]
    val method = message["method"]?.jsonPrimitive?.contentOrNull
    if (method == null) {
        call.respond(HttpStatusCode.BadRequest, rpcError(null, -32600, "invalid request"))
        return
    }
    if (id == null || id is JsonNull) {
        call.respond(HttpStatusCode.Accepted)
        return
    }
    val params = message["params"] as? JsonObject ?: JsonObject(emptyMap())
    val result = when (method) {
        "initialize" -> initializeResult()
        "ping" -> JsonObject(emptyMap())
        "tools/list" -> buildJsonObject { put("tools", tools.definitions()) }
        "tools/call" -> {
            val name = params["name"]?.jsonPrimitive?.contentOrNull
            if (name == null) {
                call.respond(rpcError(id, -32602, "tool name is required"))
                return
            }
            val arguments = params["arguments"] as? JsonObject ?: JsonObject(emptyMap())
            tools.call(name, arguments, actor)
        }
        else -> {
            call.respond(rpcError(id, -32601, "method not found"))
            return
        }
    }
    call.respond(rpcResult(id, result))
}

private fun initializeResult(): JsonObject = buildJsonObject {
    put("protocolVersion", "2025-03-26")
    put("capabilities", buildJsonObject {
        put("tools", buildJsonObject { put("listChanged", false) })
    })
    put("serverInfo", buildJsonObject {
        put("name", "cookbook")
        put("version", "0.0.0")
    })
}

private fun rpcResult(id: JsonElement, result: JsonElement): JsonObject = buildJsonObject {
    put("jsonrpc", "2.0")
    put("id", id)
    put("result", result)
}

private fun rpcError(id: JsonElement?, code: Int, message: String): JsonObject = buildJsonObject {
    put("jsonrpc", "2.0")
    if (id != null && id !is JsonNull) put("id", id)
    put("error", buildJsonObject {
        put("code", code)
        put("message", message)
    })
}
