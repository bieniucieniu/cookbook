package com.bieniucieniu.cookbook.features.auth.domain

import com.workos.usermanagement.models.User
import kotlinx.serialization.Serializable

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

data class AuthSession(
    val user: User,
    val refreshToken: String,
)
