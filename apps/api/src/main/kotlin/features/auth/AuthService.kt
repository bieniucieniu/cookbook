package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.features.auth.domain.AuthSession
import com.workos.WorkOS
import com.workos.usermanagement.types.CreateUserOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.Base64

class AuthService(
    private val workos: WorkOS,
    private val config: WorkosConfig,
) {
    suspend fun login(email: String, password: String): AuthSession? = try {
        val auth = withContext(Dispatchers.IO) {
            workos.userManagement.authenticateWithPassword(config.clientId, email, password)
        }
        val refresh = auth.refreshToken ?: return null
        val user = auth.user ?: return null
        AuthSession(user = user, refreshToken = refresh)
    } catch (_: Exception) {
        null
    }

    suspend fun register(email: String, password: String): AuthSession? {
        try {
            withContext(Dispatchers.IO) {
                workos.userManagement.createUser(
                    CreateUserOptions(
                        email = email,
                        password = password,
                    ),
                )
            }
        } catch (_: Exception) {
            return null
        }
        return login(email, password)
    }

    suspend fun userFromRefreshToken(refreshToken: String): AuthSession? {
        val auth = try {
            withContext(Dispatchers.IO) {
                workos.userManagement.authenticateWithRefreshToken(config.clientId, refreshToken)
            }
        } catch (_: Exception) {
            return null
        }
        val userId = subjectFromAccessToken(auth.accessToken) ?: return null
        val user = try {
            withContext(Dispatchers.IO) {
                workos.userManagement.getUser(userId)
            }
        } catch (_: Exception) {
            return null
        }
        return AuthSession(user = user, refreshToken = auth.refreshToken)
    }

    fun cookieSecure(): Boolean = config.cookieSecure
}

@Serializable
private data class AccessTokenPayload(val sub: String)

private val accessTokenJson = Json { ignoreUnknownKeys = true }

private fun subjectFromAccessToken(token: String): String? {
    val payload = token.split(".").getOrNull(1) ?: return null
    val padded = payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '=')
    val json = runCatching {
        String(Base64.getUrlDecoder().decode(padded))
    }.getOrNull() ?: return null
    return runCatching { accessTokenJson.decodeFromString<AccessTokenPayload>(json).sub }.getOrNull()
}
