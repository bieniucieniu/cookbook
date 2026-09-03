package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.features.auth.domain.AuthRequest
import com.bieniucieniu.cookbook.features.auth.domain.AuthSession
import com.bieniucieniu.cookbook.features.auth.domain.MeResponse
import io.ktor.http.Cookie
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import org.koin.ktor.ext.get
import org.koin.ktor.ext.inject

private const val SessionCookie = "wos-session"

fun Route.configureAuthRouting() {
    val authService: AuthService by inject()
    post("/auth/login") {
        val body = call.receive<AuthRequest>()
        val auth = authService.login(body.email, body.password)
            ?: return@post call.respond(HttpStatusCode.Unauthorized)
        call.setSessionCookie(auth.refreshToken, authService.cookieSecure())
        val user = auth.user
        call.respond(MeResponse(user.id, user.email))
    }
    post("/auth/register") {
        val body = call.receive<AuthRequest>()
        val auth = authService.register(body.email, body.password)
            ?: return@post call.respond(HttpStatusCode.Conflict)
        call.setSessionCookie(auth.refreshToken, authService.cookieSecure())
        val user = auth.user
        call.respond(MeResponse(user.id, user.email))
    }
    post("/auth/logout") {
        call.clearSessionCookie(authService.cookieSecure())
        call.respond(HttpStatusCode.NoContent)
    }
    get("/auth/me") {
        val session = call.requireUser(authService) ?: return@get
        call.respond(MeResponse(session.user.id, session.user.email))
    }
}

suspend fun ApplicationCall.requireUser(authService: AuthService = get()): AuthSession? {
    val refresh = request.cookies[SessionCookie] ?: run {
        respond(HttpStatusCode.Unauthorized)
        return null
    }
    val auth = authService.userFromRefreshToken(refresh) ?: run {
        respond(HttpStatusCode.Unauthorized)
        return null
    }
    setSessionCookie(auth.refreshToken, authService.cookieSecure())
    return auth
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
