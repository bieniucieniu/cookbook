package com.bieniucieniu.cookbook.core.http

import io.ktor.http.HttpStatusCode
import io.ktor.server.application.Application
import io.ktor.server.application.install
import io.ktor.server.plugins.statuspages.StatusPages
import io.ktor.server.response.respond
import kotlinx.serialization.Serializable

@Serializable
data class ErrorBody(val errors: List<String>)

class ApiException(
    val status: HttpStatusCode,
    val errors: List<String>,
) : RuntimeException(errors.joinToString("; "))

fun Application.configureStatusPages() {
    install(StatusPages) {
        exception<ApiException> { call, cause ->
            call.respond(cause.status, ErrorBody(cause.errors))
        }
    }
}

internal fun mapSql(error: Throwable): Throwable {
    if (error is ApiException) return error
    val text = buildString {
        append(error::class.simpleName)
        append(' ')
        append(error.message.orEmpty())
        append(' ')
        append(error.toString())
    }
    return when {
        "23505" in text || "Unique" in text ->
            ApiException(HttpStatusCode.Conflict, listOf("conflict: duplicate value"))
        "23503" in text || "ForeignKey" in text || "foreign key" in text.lowercase() ->
            ApiException(HttpStatusCode.Conflict, listOf("conflict: foreign key"))
        else -> error
    }
}
