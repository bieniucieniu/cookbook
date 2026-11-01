package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.workos.sha256Hex
import io.ktor.http.Cookie
import io.ktor.http.HttpHeaders
import io.ktor.server.application.ApplicationCall
import io.ktor.server.response.respondRedirect
import kotlin.time.Clock

const val SESSION_COOKIE = "cookbook_session"
const val AGENT_EMAIL = "agent@localhost"

fun bearerMatches(authorization: String, agentToken: String?): Boolean {
    if (agentToken.isNullOrBlank()) return false
    val prefix = "Bearer "
    if (!authorization.startsWith(prefix)) return false
    val token = authorization.removePrefix(prefix)
    if (token.length != agentToken.length) return false
    var diff = 0
    for (index in token.indices) diff = diff or (token[index].code xor agentToken[index].code)
    return diff == 0
}

data class Actor(val userId: Long)

fun interface SessionReader {
    suspend fun actor(call: ApplicationCall): Actor?
}

class SessionService(
    private val repository: AuthRepository,
    private val agentToken: String?,
) : SessionReader {
    override suspend fun actor(call: ApplicationCall): Actor? {
        val authorization = call.request.headers[HttpHeaders.Authorization]
        if (authorization != null) {
            if (!bearerMatches(authorization, agentToken)) return null
            val user = repository.userByEmail(AGENT_EMAIL) ?: return null
            return Actor(user.id)
        }
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
