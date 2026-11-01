package com.bieniucieniu.cookbook.workos

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.serializer

class UserManagement(private val workos: WorkOS) {
    fun getAuthorizationUrl(options: AuthorizationUrlOptions): String {
        val clientId = options.clientId ?: workos.requireClientId()
        return workos.browserUrl(
            "/user_management/authorize",
            mapOf(
                "client_id" to clientId,
                "redirect_uri" to options.redirectUri,
                "response_type" to "code",
                "provider" to options.provider,
                "state" to options.state,
                "code_challenge" to options.codeChallenge,
                "code_challenge_method" to if (options.codeChallenge == null) null else options.codeChallengeMethod ?: "S256",
                "screen_hint" to options.screenHint,
                "login_hint" to options.loginHint,
                "domain_hint" to options.domainHint,
                "organization_id" to options.organizationId,
                "connection_id" to options.connectionId,
                "prompt" to options.prompt,
                "invitation_token" to options.invitationToken,
                "max_age" to options.maxAge?.toString(),
                "provider_scopes" to options.providerScopes?.joinToString(","),
                "provider_query_params" to options.providerQueryParams?.let { params ->
                    jsonBody(params.entries.associate { it.key to it.value as Any? }).toString()
                },
            ),
        )
    }

    fun getAuthorizationUrlWithPKCE(options: AuthorizationUrlOptions): PkceAuthorizationUrl {
        val verifier = workos.randomToken()
        val challenge = pkceS256(verifier)
        val state = options.state ?: workos.randomToken()
        return PkceAuthorizationUrl(
            url = getAuthorizationUrl(
                options.copy(state = state, codeChallenge = challenge, codeChallengeMethod = "S256"),
            ),
            codeVerifier = verifier,
            codeChallenge = challenge,
            state = state,
        )
    }

    fun getLogoutUrl(options: LogoutUrlOptions): String =
        workos.browserUrl(
            "/user_management/sessions/logout",
            mapOf(
                "session_id" to options.sessionId,
                "return_to" to options.returnTo,
            ),
        )

    suspend fun authenticateWithCode(
        code: String,
        codeVerifier: String? = null,
        invitationToken: String? = null,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
        signalsId: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "authorization_code",
            "code" to code,
            "code_verifier" to codeVerifier,
            "invitation_token" to invitationToken,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
            "signals_id" to signalsId,
        ),
    )

    suspend fun authenticateWithPassword(
        email: String,
        password: String,
        invitationToken: String? = null,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
        signalsId: String? = null,
        radarAuthAttemptId: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "password",
            "email" to email,
            "password" to password,
            "invitation_token" to invitationToken,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
            "signals_id" to signalsId,
            "radar_auth_attempt_id" to radarAuthAttemptId,
        ),
    )

    suspend fun authenticateWithRefreshToken(
        refreshToken: String,
        organizationId: String? = null,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "refresh_token",
            "refresh_token" to refreshToken,
            "organization_id" to organizationId,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
        ),
    )

    suspend fun authenticateWithMagicAuth(
        code: String,
        email: String,
        invitationToken: String? = null,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
        radarAuthAttemptId: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "urn:workos:oauth:grant-type:magic-auth:code",
            "code" to code,
            "email" to email,
            "invitation_token" to invitationToken,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
            "radar_auth_attempt_id" to radarAuthAttemptId,
        ),
    )

    suspend fun authenticateWithEmailVerification(
        code: String,
        pendingAuthenticationToken: String,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "urn:workos:oauth:grant-type:email-verification:code",
            "code" to code,
            "pending_authentication_token" to pendingAuthenticationToken,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
        ),
    )

    suspend fun authenticateWithTotp(
        code: String,
        pendingAuthenticationToken: String,
        authenticationChallengeId: String,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "urn:workos:oauth:grant-type:mfa-totp",
            "code" to code,
            "pending_authentication_token" to pendingAuthenticationToken,
            "authentication_challenge_id" to authenticationChallengeId,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
        ),
    )

    suspend fun authenticateWithOrganizationSelection(
        pendingAuthenticationToken: String,
        organizationId: String,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "urn:workos:oauth:grant-type:organization-selection",
            "pending_authentication_token" to pendingAuthenticationToken,
            "organization_id" to organizationId,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
        ),
    )

    suspend fun authenticateWithDeviceCode(
        deviceCode: String,
        ipAddress: String? = null,
        deviceId: String? = null,
        userAgent: String? = null,
    ): AuthenticateResponse = authenticate(
        mapOf(
            "grant_type" to "urn:ietf:params:oauth:grant-type:device_code",
            "device_code" to deviceCode,
            "ip_address" to ipAddress,
            "device_id" to deviceId,
            "user_agent" to userAgent,
        ),
    )

    suspend fun revokeSession(sessionId: String) {
        workos.requireApiKey("userManagement.revokeSession")
        workos.http.post("/user_management/sessions/revoke", jsonBody(mapOf("session_id" to sessionId)), emptyOk = true)
    }

    suspend fun get(id: String): User {
        workos.requireApiKey("userManagement.get")
        return decodeUser(workos.http.get("/user_management/users/$id"))
    }

    suspend fun list(
        email: String? = null,
        organizationId: String? = null,
        limit: Int? = null,
        before: String? = null,
        after: String? = null,
        order: PaginationOrder? = null,
        organization: String? = null,
    ): Page<User> {
        workos.requireApiKey("userManagement.list")
        val body = workos.http.get(
            "/user_management/users",
            mapOf(
                "email" to email,
                "organization" to organization,
                "organization_id" to organizationId,
                "limit" to limit?.toString(),
                "before" to before,
                "after" to after,
                "order" to order?.serialName(),
            ),
        )
        return workos.http.json.decodeFromJsonElement(serializer<Page<User>>(), body)
    }

    suspend fun getByExternalId(externalId: String): User {
        workos.requireApiKey("userManagement.getByExternalId")
        return decodeUser(workos.http.get("/user_management/users/external_id/$externalId"))
    }

    suspend fun create(
        email: String,
        password: String? = null,
        firstName: String? = null,
        lastName: String? = null,
        emailVerified: Boolean? = null,
        externalId: String? = null,
        metadata: Map<String, String>? = null,
    ): User {
        workos.requireApiKey("userManagement.create")
        return decodeUser(
            workos.http.post(
                "/user_management/users",
                jsonBody(
                    mapOf(
                        "email" to email,
                        "password" to password,
                        "first_name" to firstName,
                        "last_name" to lastName,
                        "email_verified" to emailVerified,
                        "external_id" to externalId,
                        "metadata" to metadata,
                    ),
                ),
            ),
        )
    }

    suspend fun update(
        id: String,
        email: String? = null,
        firstName: String? = null,
        lastName: String? = null,
        emailVerified: Boolean? = null,
        externalId: String? = null,
        password: String? = null,
        metadata: Map<String, String>? = null,
    ): User {
        workos.requireApiKey("userManagement.update")
        return decodeUser(
            workos.http.put(
                "/user_management/users/$id",
                jsonBody(
                    mapOf(
                        "email" to email,
                        "password" to password,
                        "first_name" to firstName,
                        "last_name" to lastName,
                        "email_verified" to emailVerified,
                        "external_id" to externalId,
                        "metadata" to metadata,
                    ),
                ),
            ),
        )
    }

    suspend fun sendInvitation(
        email: String,
        organizationId: String? = null,
        roleSlug: String? = null,
        expiresInDays: Int? = null,
        inviterUserId: String? = null,
    ): Invitation {
        workos.requireApiKey("userManagement.sendInvitation")
        return decode(
            workos.http.post(
                "/user_management/invitations",
                jsonBody(
                    mapOf(
                        "email" to email,
                        "organization_id" to organizationId,
                        "role_slug" to roleSlug,
                        "expires_in_days" to expiresInDays,
                        "inviter_user_id" to inviterUserId,
                    ),
                ),
            ),
        )
    }

    suspend fun getInvitation(id: String): Invitation {
        workos.requireApiKey("userManagement.getInvitation")
        return decode(workos.http.get("/user_management/invitations/$id"))
    }

    suspend fun findInvitationByToken(token: String): Invitation {
        workos.requireApiKey("userManagement.findInvitationByToken")
        return decode(workos.http.get("/user_management/invitations/by_token/$token"))
    }

    suspend fun listInvitations(
        email: String? = null,
        organizationId: String? = null,
        limit: Int? = null,
        before: String? = null,
        after: String? = null,
        order: PaginationOrder? = null,
    ): Page<Invitation> {
        workos.requireApiKey("userManagement.listInvitations")
        return page(
            workos.http.get(
                "/user_management/invitations",
                pageQuery(limit, before, after, order) + mapOf(
                    "email" to email,
                    "organization_id" to organizationId,
                ),
            ),
        )
    }

    suspend fun revokeInvitation(id: String): Invitation {
        workos.requireApiKey("userManagement.revokeInvitation")
        return decode(workos.http.post("/user_management/invitations/$id/revoke", jsonBody(emptyMap())))
    }

    suspend fun resendInvitation(id: String): Invitation {
        workos.requireApiKey("userManagement.resendInvitation")
        return decode(workos.http.post("/user_management/invitations/$id/resend", jsonBody(emptyMap())))
    }

    suspend fun acceptInvitation(id: String): Invitation {
        workos.requireApiKey("userManagement.acceptInvitation")
        return decode(workos.http.post("/user_management/invitations/$id/accept", jsonBody(emptyMap())))
    }

    suspend fun createMagicAuth(email: String, invitationToken: String? = null): MagicAuth {
        workos.requireApiKey("userManagement.createMagicAuth")
        return decode(
            workos.http.post(
                "/user_management/magic_auth",
                jsonBody(mapOf("email" to email, "invitation_token" to invitationToken)),
            ),
        )
    }

    suspend fun resetPassword(email: String): PasswordReset {
        workos.requireApiKey("userManagement.resetPassword")
        return decode(workos.http.post("/user_management/password_reset", jsonBody(mapOf("email" to email))))
    }

    suspend fun confirmPasswordReset(token: String, newPassword: String): ResetPasswordResponse {
        workos.requireApiKey("userManagement.confirmPasswordReset")
        return decode(
            workos.http.post(
                "/user_management/password_reset/confirm",
                jsonBody(mapOf("token" to token, "new_password" to newPassword)),
            ),
        )
    }

    suspend fun delete(id: String) {
        workos.requireApiKey("userManagement.delete")
        workos.http.delete("/user_management/users/$id")
    }

    private suspend fun authenticate(fields: Map<String, Any?>): AuthenticateResponse {
        val body = linkedMapOf<String, Any?>(
            "client_id" to workos.requireClientId(),
            "client_secret" to workos.apiKey,
        )
        body.putAll(fields)
        val json = workos.http.post("/user_management/authenticate", jsonBody(body))
        return workos.http.json.decodeFromJsonElement(AuthenticateResponse.serializer(), json)
    }

    private fun decodeUser(json: JsonObject): User = decode(json)

    private inline fun <reified T> decode(json: JsonObject): T =
        workos.http.json.decodeFromJsonElement(serializer(), json)

    private inline fun <reified T> page(json: JsonObject): Page<T> =
        workos.http.json.decodeFromJsonElement(serializer(), json)

}

private fun PaginationOrder.serialName(): String = when (this) {
    PaginationOrder.Asc -> "asc"
    PaginationOrder.Desc -> "desc"
    PaginationOrder.Normal -> "normal"
}

class Organizations(private val workos: WorkOS) {
    suspend fun create(
        name: String,
        externalId: String? = null,
        allowProfilesOutsideOrganization: Boolean? = null,
        metadata: Map<String, String>? = null,
    ): Organization {
        workos.requireApiKey("organizations.create")
        val json = workos.http.post(
            "/organizations",
            jsonBody(
                mapOf(
                    "name" to name,
                    "external_id" to externalId,
                    "allow_profiles_outside_organization" to allowProfilesOutsideOrganization,
                    "metadata" to metadata,
                ),
            ),
        )
        return workos.http.json.decodeFromJsonElement(Organization.serializer(), json)
    }

    suspend fun update(
        id: String,
        name: String? = null,
        externalId: String? = null,
        allowProfilesOutsideOrganization: Boolean? = null,
        metadata: Map<String, String>? = null,
    ): Organization {
        workos.requireApiKey("organizations.update")
        val json = workos.http.put(
            "/organizations/$id",
            jsonBody(
                mapOf(
                    "name" to name,
                    "external_id" to externalId,
                    "allow_profiles_outside_organization" to allowProfilesOutsideOrganization,
                    "metadata" to metadata,
                ),
            ),
        )
        return workos.http.json.decodeFromJsonElement(Organization.serializer(), json)
    }

    suspend fun delete(id: String) {
        workos.requireApiKey("organizations.delete")
        workos.http.delete("/organizations/$id")
    }

    suspend fun get(id: String): Organization {
        workos.requireApiKey("organizations.get")
        val json = workos.http.get("/organizations/$id")
        return workos.http.json.decodeFromJsonElement(Organization.serializer(), json)
    }

    suspend fun list(
        limit: Int? = null,
        before: String? = null,
        after: String? = null,
        order: PaginationOrder? = null,
        domains: List<String>? = null,
        search: String? = null,
    ): Page<Organization> {
        workos.requireApiKey("organizations.list")
        val json = workos.http.get(
            "/organizations",
            pageQuery(limit, before, after, order) + mapOf(
                "domains" to domains?.joinToString(","),
                "search" to search,
            ),
        )
        return workos.http.json.decodeFromJsonElement(serializer<Page<Organization>>(), json)
    }
}

internal fun pageQuery(
    limit: Int?,
    before: String?,
    after: String?,
    order: PaginationOrder?,
): Map<String, String?> = mapOf(
    "limit" to limit?.toString(),
    "before" to before,
    "after" to after,
    "order" to order?.let {
        when (it) {
            PaginationOrder.Asc -> "asc"
            PaginationOrder.Desc -> "desc"
            PaginationOrder.Normal -> "normal"
        }
    },
)
