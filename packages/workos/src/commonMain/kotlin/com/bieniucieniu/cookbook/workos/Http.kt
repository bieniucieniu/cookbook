package com.bieniucieniu.cookbook.workos

import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.URLBuilder
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

internal class WorkOsHttp(
    val baseUrl: String,
    engine: HttpClientEngine,
    private val apiKey: String?,
) {
    val json: Json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val client = HttpClient(engine) {
        install(ContentNegotiation) { json(json) }
    }

    fun close() {
        client.close()
    }

    suspend fun post(
        path: String,
        body: JsonObject,
        emptyOk: Boolean = false,
        headers: Map<String, String> = emptyMap(),
    ): JsonObject = read(path, request(path) {
        client.post(url(path)) {
            contentType(ContentType.Application.Json)
            authorize()
            headers.forEach { (name, value) -> header(name, value) }
            setBody(body)
        }
    }, emptyOk)

    suspend fun put(path: String, body: JsonObject, emptyOk: Boolean = false): JsonObject = read(path, request(path) {
        client.put(url(path)) {
            contentType(ContentType.Application.Json)
            authorize()
            setBody(body)
        }
    }, emptyOk)

    suspend fun get(path: String, query: Map<String, String?> = emptyMap()): JsonObject {
        val target = URLBuilder(url(path)).apply {
            query.forEach { (name, value) ->
                if (value != null) parameters.append(name, value)
            }
        }.buildString()
        return read(path, request(path) {
            client.get(target) {
                authorize()
            }
        }, emptyOk = false)
    }

    suspend fun delete(path: String) {
        read(path, request(path) {
            client.delete(url(path)) {
                authorize()
            }
        }, emptyOk = true)
    }

    private fun io.ktor.client.request.HttpRequestBuilder.authorize() {
        header(HttpHeaders.UserAgent, USER_AGENT)
        if (apiKey != null) header(HttpHeaders.Authorization, "Bearer $apiKey")
    }

    private fun url(path: String): String = baseUrl.trimEnd('/') + path

    private suspend fun request(path: String, block: suspend () -> HttpResponse): HttpResponse =
        try {
            block()
        } catch (error: Throwable) {
            if (error is WorkOSException) throw error
            throw TransportException(error.message ?: "WorkOS transport failure on $path", error)
        }

    private suspend fun read(path: String, response: HttpResponse, emptyOk: Boolean): JsonObject {
        val text = response.bodyAsText()
        if (!response.status.isSuccess()) throw error(path, response, text)
        if (text.isBlank()) {
            if (emptyOk) return JsonObject(emptyMap())
            throw WorkOSGenericException("empty WorkOS response", response.status.value, null, requestId(response))
        }
        val element = json.parseToJsonElement(text)
        return element as? JsonObject ?: JsonObject(emptyMap())
    }

    private fun error(path: String, response: HttpResponse, text: String): WorkOSException {
        val body = try {
            json.parseToJsonElement(text) as? JsonObject
        } catch (_: Throwable) {
            null
        }
        val message = body?.get("message")?.jsonPrimitive?.contentOrNull
            ?: body?.get("error_description")?.jsonPrimitive?.contentOrNull
            ?: body?.get("error")?.jsonPrimitive?.contentOrNull
            ?: "WorkOS request failed ($path)"
        val code = body?.get("code")?.jsonPrimitive?.contentOrNull
            ?: body?.get("error")?.jsonPrimitive?.contentOrNull
        val requestId = requestId(response)
        val status = response.status.value
        return when (status) {
            400 -> BadRequestException(message, code, requestId)
            401 -> UnauthorizedException(message, code, requestId)
            404 -> NotFoundException(message, code, requestId)
            422 -> UnprocessableEntityException(message, code, requestId)
            429 -> RateLimitException(message, code, requestId, response.headers[HttpHeaders.RetryAfter]?.toLongOrNull())
            in 500..599 -> GenericServerException(message, status, code, requestId)
            else -> WorkOSGenericException(message, status, code, requestId)
        }
    }

    private fun requestId(response: HttpResponse): String? = response.headers["X-Request-ID"]

    private companion object {
        const val USER_AGENT = "cookbook-workos"
    }
}

internal fun jsonBody(fields: Map<String, Any?>): JsonObject = buildJsonObject {
    for ((name, value) in fields) putJson(name, value)
}

private fun kotlinx.serialization.json.JsonObjectBuilder.putJson(name: String, value: Any?) {
    when (value) {
        null -> Unit
        is String -> put(name, value)
        is Boolean -> put(name, value)
        is Int -> put(name, value)
        is Long -> put(name, value)
        is JsonObject -> put(name, value)
        is JsonArray -> put(name, value)
        is Map<*, *> -> put(name, jsonBody(value.entries.associate { it.key.toString() to it.value }))
        is List<*> -> put(name, buildJsonArray {
            value.forEach { item ->
                when (item) {
                    null -> Unit
                    is String -> add(kotlinx.serialization.json.JsonPrimitive(item))
                    is Boolean -> add(kotlinx.serialization.json.JsonPrimitive(item))
                    is Int -> add(kotlinx.serialization.json.JsonPrimitive(item))
                    is Long -> add(kotlinx.serialization.json.JsonPrimitive(item))
                    is Map<*, *> -> add(jsonBody(item.entries.associate { it.key.toString() to it.value }))
                    else -> error("unsupported json list item in $name")
                }
            }
        })
        else -> error("unsupported json field $name")
    }
}
