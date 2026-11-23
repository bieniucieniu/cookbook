package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.features.mcp.bearerToken
import com.bieniucieniu.cookbook.workos.secureEquals
import com.bieniucieniu.cookbook.workos.sha256Hex
import io.ktor.http.Cookie
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import kotlin.time.Clock

const val SESSION_COOKIE = "cookbook_session"
const val AGENT_EMAIL = "agent@localhost"

fun bearerMatches(authorization: String, agentToken: String?): Boolean {
    if (agentToken.isNullOrBlank()) return false
    val token = bearerToken(authorization) ?: return false
    return secureEquals(token, agentToken)
}

data class Actor(val userId: Long)

fun interface SessionReader {
    suspend fun actor(call: ApplicationCall): Actor?
}

suspend fun SessionReader.requireActor(call: ApplicationCall): Actor =
    actor(call) ?: throw loginRequired()

fun loginRequired(): ApiException = ApiException(HttpStatusCode.Unauthorized, listOf("login required"))

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
        val tokenHash = sha256Hex(token)
        val session = repository.session(tokenHash) ?: return null
        if (session.expiresAt <= nowSeconds()) {
            repository.deleteSession(tokenHash)
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
