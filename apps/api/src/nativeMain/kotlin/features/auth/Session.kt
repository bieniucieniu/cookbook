package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.workos.sha256Hex
import io.ktor.http.Cookie
import io.ktor.server.application.ApplicationCall
import io.ktor.server.response.respondRedirect
import kotlin.time.Clock

const val SESSION_COOKIE = "cookbook_session"

data class Actor(val userId: Long)

fun interface SessionReader {
    suspend fun actor(call: ApplicationCall): Actor?
}

class SessionService(private val repository: AuthRepository) : SessionReader {
    override suspend fun actor(call: ApplicationCall): Actor? {
        val token = call.request.cookies[SESSION_COOKIE] ?: return null
        val session = repository.session(sha256Hex(token)) ?: return null
        if (session.expiresAt <= nowSeconds()) {
            repository.deleteSession(sha256Hex(token))
            return null
        }
        return Actor(session.userId)
    }
}

fun nowSeconds(): Long = Clock.System.now().epochSeconds

fun sessionCookie(token: String, maxAgeSeconds: Long): Cookie = Cookie(
    name = SESSION_COOKIE,
    value = token,
    maxAge = maxAgeSeconds.toInt(),
    path = "/",
    httpOnly = true,
    secure = false,
    extensions = mapOf("SameSite" to "Lax"),
)

fun clearSessionCookie(): Cookie = Cookie(
    name = SESSION_COOKIE,
    value = "",
    maxAge = 0,
    path = "/",
    httpOnly = true,
    extensions = mapOf("SameSite" to "Lax"),
)

suspend fun ApplicationCall.redirect(location: String): Unit = respondRedirect(location)
