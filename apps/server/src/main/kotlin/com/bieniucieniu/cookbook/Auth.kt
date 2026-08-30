package com.bieniucieniu.cookbook

import com.workos.WorkOS
import com.workos.usermanagement.models.User
import com.workos.usermanagement.types.CreateUserOptions
import io.ktor.http.Cookie
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.Base64

private const val SessionCookie = "wos-session"

@Serializable
data class AuthRequest(
    val email: String,
    val password: String,
)

@Serializable
data class MeResponse(
    val id: String,
    val email: String,
)

@Serializable
private data class AccessTokenPayload(val sub: String)

private val accessTokenJson = Json { ignoreUnknownKeys = true }

fun Route.authRoutes(workos: WorkOS, clientId: String, cookieSecure: Boolean) {
    post("/auth/login") {
        val body = call.receive<AuthRequest>()
        val auth = try {
            withContext(Dispatchers.IO) {
                workos.userManagement.authenticateWithPassword(clientId, body.email, body.password)
            }
        } catch (_: Exception) {
            return@post call.respond(HttpStatusCode.Unauthorized)
        }
        val refresh = auth.refreshToken ?: return@post call.respond(HttpStatusCode.Unauthorized)
        call.setSessionCookie(refresh, cookieSecure)
        val user = auth.user ?: return@post call.respond(HttpStatusCode.Unauthorized)
        call.respond(MeResponse(user.id, user.email))
    }
    post("/auth/register") {
        val body = call.receive<AuthRequest>()
        try {
            withContext(Dispatchers.IO) {
                workos.userManagement.createUser(
                    CreateUserOptions(
                        email = body.email,
                        password = body.password,
                    ),
                )
            }
        } catch (_: Exception) {
            return@post call.respond(HttpStatusCode.Conflict)
        }
        val auth = withContext(Dispatchers.IO) {
            workos.userManagement.authenticateWithPassword(clientId, body.email, body.password)
        }
        val refresh = auth.refreshToken ?: return@post call.respond(HttpStatusCode.Unauthorized)
        call.setSessionCookie(refresh, cookieSecure)
        val user = auth.user ?: return@post call.respond(HttpStatusCode.Unauthorized)
        call.respond(MeResponse(user.id, user.email))
    }
    post("/auth/logout") {
        call.clearSessionCookie(cookieSecure)
        call.respond(HttpStatusCode.NoContent)
    }
    get("/auth/me") {
        val user = call.requireUser(workos, clientId, cookieSecure) ?: return@get
        call.respond(MeResponse(user.id, user.email))
    }
}

suspend fun ApplicationCall.requireUser(
    workos: WorkOS,
    clientId: String,
    cookieSecure: Boolean,
): User? {
    val refresh = request.cookies[SessionCookie] ?: run {
        respond(HttpStatusCode.Unauthorized)
        return null
    }
    val auth = try {
        withContext(Dispatchers.IO) {
            workos.userManagement.authenticateWithRefreshToken(clientId, refresh)
        }
    } catch (_: Exception) {
        respond(HttpStatusCode.Unauthorized)
        return null
    }
    setSessionCookie(auth.refreshToken, cookieSecure)
    val userId = subjectFromAccessToken(auth.accessToken) ?: run {
        respond(HttpStatusCode.Unauthorized)
        return null
    }
    return try {
        withContext(Dispatchers.IO) {
            workos.userManagement.getUser(userId)
        }
    } catch (_: Exception) {
        respond(HttpStatusCode.Unauthorized)
        null
    }
}

private fun subjectFromAccessToken(token: String): String? {
    val payload = token.split(".").getOrNull(1) ?: return null
    val padded = payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '=')
    val json = runCatching {
        String(Base64.getUrlDecoder().decode(padded))
    }.getOrNull() ?: return null
    return runCatching { accessTokenJson.decodeFromString<AccessTokenPayload>(json).sub }.getOrNull()
}

private fun ApplicationCall.setSessionCookie(value: String, secure: Boolean) {
    response.cookies.append(
        Cookie(
            name = SessionCookie,
            value = value,
            path = "/",
            httpOnly = true,
            secure = secure,
            maxAge = 60 * 60 * 24 * 7,
            extensions = mapOf("SameSite" to "Lax"),
        ),
    )
}

private fun ApplicationCall.clearSessionCookie(secure: Boolean) {
    response.cookies.append(
        Cookie(
            name = SessionCookie,
            value = "",
            path = "/",
            httpOnly = true,
            secure = secure,
            maxAge = 0,
            extensions = mapOf("SameSite" to "Lax"),
        ),
    )
}
