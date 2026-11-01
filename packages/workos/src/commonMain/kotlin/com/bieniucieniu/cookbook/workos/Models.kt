package com.bieniucieniu.cookbook.workos

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class PaginationOrder {
    @SerialName("asc") Asc,
    @SerialName("desc") Desc,
    @SerialName("normal") Normal,
}

@Serializable
data class ListMetadata(
    val before: String? = null,
    val after: String? = null,
)

@Serializable
data class Page<T>(
    val data: List<T> = emptyList(),
    @SerialName("list_metadata") val listMetadata: ListMetadata = ListMetadata(),
)

@Serializable
data class User(
    val id: String,
    val email: String,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    @SerialName("email_verified") val emailVerified: Boolean = false,
    @SerialName("profile_picture_url") val profilePictureUrl: String? = null,
    @SerialName("external_id") val externalId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class Impersonator(
    val email: String,
    val reason: String? = null,
)

@Serializable
data class AuthenticateResponse(
    val user: User,
    @SerialName("organization_id") val organizationId: String? = null,
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("authentication_method") val authenticationMethod: String? = null,
    val impersonator: Impersonator? = null,
)

@Serializable
data class Organization(
    val id: String,
    val name: String,
)

data class AuthorizationUrlOptions(
    val redirectUri: String,
    val clientId: String? = null,
    val state: String? = null,
    val provider: String? = "authkit",
    val codeChallenge: String? = null,
    val codeChallengeMethod: String? = null,
    val screenHint: String? = null,
    val loginHint: String? = null,
    val domainHint: String? = null,
    val organizationId: String? = null,
    val connectionId: String? = null,
    val prompt: String? = null,
    val invitationToken: String? = null,
    val maxAge: Int? = null,
    val providerScopes: List<String>? = null,
    val providerQueryParams: Map<String, String>? = null,
)

data class PkceAuthorizationUrl(
    val url: String,
    val codeVerifier: String,
    val codeChallenge: String,
    val state: String,
)

data class LogoutUrlOptions(
    val sessionId: String,
    val returnTo: String? = null,
)

typealias AuthKitAuthorizationUrlOptions = AuthorizationUrlOptions
typealias AuthKitLogoutUrlOptions = LogoutUrlOptions
typealias PKCEAuthorizationUrlResult = PkceAuthorizationUrl

@Serializable
data class Role(
    val slug: String,
)

@Serializable
data class OrganizationMembership(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("organization_id") val organizationId: String,
    val status: String,
    val role: Role? = null,
    val user: User? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
)

@Serializable
data class Invitation(
    val id: String,
    val email: String,
    val state: String? = null,
    @SerialName("organization_id") val organizationId: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    val token: String? = null,
    @SerialName("accept_invitation_url") val acceptInvitationUrl: String? = null,
)

@Serializable
data class MagicAuth(
    val id: String,
    val email: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("user_id") val userId: String? = null,
)

@Serializable
data class PasswordReset(
    val id: String,
    val email: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("password_reset_url") val passwordResetUrl: String? = null,
)

@Serializable
data class ResetPasswordResponse(
    val user: User,
)

@Serializable
data class Profile(
    val id: String,
    val email: String? = null,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    @SerialName("organization_id") val organizationId: String? = null,
    @SerialName("connection_id") val connectionId: String? = null,
    @SerialName("connection_type") val connectionType: String? = null,
    @SerialName("idp_id") val idpId: String? = null,
)

@Serializable
data class ProfileAndToken(
    @SerialName("access_token") val accessToken: String,
    val profile: Profile,
)

data class SsoAuthorizationUrlOptions(
    val redirectUri: String,
    val clientId: String? = null,
    val state: String? = null,
    val organization: String? = null,
    val connection: String? = null,
    val provider: String? = null,
    val domain: String? = null,
    val domainHint: String? = null,
    val loginHint: String? = null,
)

@Serializable
data class Event(
    val id: String,
    val event: String,
    @SerialName("created_at") val createdAt: String? = null,
    val data: kotlinx.serialization.json.JsonObject = kotlinx.serialization.json.JsonObject(emptyMap()),
)

data class AuditLogActor(
    val id: String,
    val type: String,
    val name: String? = null,
)

data class AuditLogTarget(
    val id: String,
    val type: String,
    val name: String? = null,
)

data class AuditLogContext(
    val location: String? = null,
    val userAgent: String? = null,
)

data class AuditLogEvent(
    val action: String,
    val occurredAt: String,
    val actor: AuditLogActor,
    val targets: List<AuditLogTarget>,
    val context: AuditLogContext = AuditLogContext(),
    val metadata: Map<String, String>? = null,
)
