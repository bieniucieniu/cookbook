package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.core.http.ApiException
import com.bieniucieniu.cookbook.core.http.workosNotConfigured
import com.bieniucieniu.cookbook.workos.AuthorizationUrlOptions
import com.bieniucieniu.cookbook.workos.LogoutUrlOptions
import com.bieniucieniu.cookbook.workos.WorkOS
import com.bieniucieniu.cookbook.workos.WorkOSException
import com.bieniucieniu.cookbook.workos.sessionIdFromAccessToken
import com.bieniucieniu.cookbook.workos.sha256Hex
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.ApplicationCall
import io.ktor.server.request.userAgent
import io.ktor.server.response.respondRedirect
import kotlinx.serialization.Serializable

@Serializable
data class MeResponse(
    val id: Long,
    val email: String,
    val firstName: String,
    val lastName: String,
)

class AuthService(
    private val config: AuthConfig,
    private val repository: AuthRepository,
    val workos: WorkOS?,
) {
    suspend fun loginUrl(): String {
        val client = workos ?: throw workosNotConfigured()
        val state = client.randomToken()
        val issued = client.userManagement.getAuthorizationUrlWithPKCE(
            AuthorizationUrlOptions(
                redirectUri = config.redirectUri,
                state = state,
                provider = "authkit",
            ),
        )
        repository.insertAttempt(state, issued.codeVerifier, nowSeconds() + 600)
        return issued.url
    }

    suspend fun callback(call: ApplicationCall) {
        val client = workos ?: throw workosNotConfigured()
        val code = call.request.queryParameters["code"]
            ?: throw ApiException(HttpStatusCode.BadRequest, listOf("code is required"))
        val state = call.request.queryParameters["state"]
            ?: throw ApiException(HttpStatusCode.BadRequest, listOf("state is required"))
        val attempt = repository.attempt(state)
            ?: throw ApiException(HttpStatusCode.BadRequest, listOf("unknown login state"))
        repository.deleteAttempt(state)
        if (attempt.expiresAt <= nowSeconds()) {
            throw ApiException(HttpStatusCode.BadRequest, listOf("login state expired"))
        }
        val authenticated = try {
            client.userManagement.authenticateWithCode(
                code = code,
                codeVerifier = attempt.codeVerifier,
                ipAddress = call.request.local.remoteHost,
                userAgent = call.request.userAgent(),
            )
        } catch (error: WorkOSException) {
            val status = when (error.status) {
                in 400..499 -> HttpStatusCode.fromValue(error.status)
                else -> HttpStatusCode.BadGateway
            }
            throw ApiException(status, listOf(error.message ?: "workos authentication failed"))
        }
        val user = repository.upsertUser(
            workosUserId = authenticated.user.id,
            email = authenticated.user.email,
            firstName = authenticated.user.firstName.orEmpty(),
            lastName = authenticated.user.lastName.orEmpty(),
        )
        val token = client.randomToken()
        repository.insertSession(
            userId = user.id,
            tokenHash = sha256Hex(token),
            workosSessionId = sessionIdFromAccessToken(authenticated.accessToken),
            expiresAt = nowSeconds() + config.sessionTtlSeconds,
        )
        call.response.cookies.append(sessionCookie(token, config.sessionTtlSeconds))
        call.respondRedirect("/")
    }

    suspend fun me(actor: Actor?): MeResponse {
        val current = actor ?: throw loginRequired()
        val user = repository.userById(current.userId) ?: throw loginRequired()
        return MeResponse(user.id, user.email, user.firstName, user.lastName)
    }

    suspend fun logout(call: ApplicationCall) {
        val token = call.request.cookies[SESSION_COOKIE]
        val tokenHash = token?.let(::sha256Hex)
        val session = tokenHash?.let { repository.session(it) }
        if (tokenHash != null) repository.deleteSession(tokenHash)
        call.response.cookies.append(clearSessionCookie())
        val sid = session?.workosSessionId
        val client = workos
        if (sid != null && client != null) {
            call.respondRedirect(client.userManagement.getLogoutUrl(LogoutUrlOptions(sid, config.logoutReturnTo)))
        } else {
            call.respondRedirect("/")
        }
    }
}
