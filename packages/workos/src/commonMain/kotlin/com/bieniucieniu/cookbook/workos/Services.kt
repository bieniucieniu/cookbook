package com.bieniucieniu.cookbook.workos

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.serializer

class OrganizationMembershipService(private val workos: WorkOS) {
    suspend fun create(userId: String, organizationId: String, roleSlug: String? = null): OrganizationMembership {
        workos.requireApiKey("organizationMembership.create")
        return decode(
            workos.http.post(
                "/user_management/organization_memberships",
                jsonBody(
                    mapOf(
                        "user_id" to userId,
                        "organization_id" to organizationId,
                        "role_slug" to roleSlug,
                    ),
                ),
            ),
        )
    }

    suspend fun get(id: String): OrganizationMembership {
        workos.requireApiKey("organizationMembership.get")
        return decode(workos.http.get("/user_management/organization_memberships/$id"))
    }

    suspend fun list(
        organizationId: String? = null,
        userId: String? = null,
        statuses: List<String>? = null,
        limit: Int? = null,
        before: String? = null,
        after: String? = null,
        order: PaginationOrder? = null,
    ): Page<OrganizationMembership> {
        workos.requireApiKey("organizationMembership.list")
        return page(
            workos.http.get(
                "/user_management/organization_memberships",
                pageQuery(limit, before, after, order) + mapOf(
                    "organization_id" to organizationId,
                    "user_id" to userId,
                    "statuses" to statuses?.joinToString(","),
                ),
            ),
        )
    }

    suspend fun update(id: String, roleSlug: String): OrganizationMembership {
        workos.requireApiKey("organizationMembership.update")
        return decode(
            workos.http.put(
                "/user_management/organization_memberships/$id",
                jsonBody(mapOf("role_slug" to roleSlug)),
            ),
        )
    }

    suspend fun delete(id: String) {
        workos.requireApiKey("organizationMembership.delete")
        workos.http.delete("/user_management/organization_memberships/$id")
    }

    suspend fun deactivate(id: String): OrganizationMembership {
        workos.requireApiKey("organizationMembership.deactivate")
        return decode(workos.http.put("/user_management/organization_memberships/$id/deactivate", jsonBody(emptyMap())))
    }

    suspend fun reactivate(id: String): OrganizationMembership {
        workos.requireApiKey("organizationMembership.reactivate")
        return decode(workos.http.put("/user_management/organization_memberships/$id/reactivate", jsonBody(emptyMap())))
    }

    private inline fun <reified T> decode(json: JsonObject): T =
        workos.http.json.decodeFromJsonElement(serializer(), json)

    private inline fun <reified T> page(json: JsonObject): Page<T> =
        workos.http.json.decodeFromJsonElement(serializer(), json)
}

class Sso(private val workos: WorkOS) {
    fun getAuthorizationUrl(options: SsoAuthorizationUrlOptions): String {
        val clientId = options.clientId ?: workos.requireClientId()
        return workos.browserUrl(
            "/sso/authorize",
            mapOf(
                "client_id" to clientId,
                "redirect_uri" to options.redirectUri,
                "response_type" to "code",
                "state" to options.state,
                "organization" to options.organization,
                "connection" to options.connection,
                "provider" to options.provider,
                "domain" to options.domain,
                "domain_hint" to options.domainHint,
                "login_hint" to options.loginHint,
            ),
        )
    }

    suspend fun getProfileAndToken(code: String, codeVerifier: String? = null): ProfileAndToken {
        workos.requireApiKey("sso.getProfileAndToken")
        val json = workos.http.post(
            "/sso/token",
            jsonBody(
                mapOf(
                    "client_id" to workos.requireClientId(),
                    "client_secret" to workos.apiKey,
                    "grant_type" to "authorization_code",
                    "code" to code,
                    "code_verifier" to codeVerifier,
                ),
            ),
        )
        return workos.http.json.decodeFromJsonElement(ProfileAndToken.serializer(), json)
    }
}

class Events(private val workos: WorkOS) {
    suspend fun list(
        events: List<String>,
        limit: Int? = null,
        before: String? = null,
        after: String? = null,
        order: PaginationOrder? = null,
        rangeStart: String? = null,
        rangeEnd: String? = null,
        organizationId: String? = null,
    ): Page<Event> {
        workos.requireApiKey("events.list")
        val json = workos.http.get(
            "/events",
            pageQuery(limit, before, after, order) + mapOf(
                "events" to events.joinToString(","),
                "range_start" to rangeStart,
                "range_end" to rangeEnd,
                "organization_id" to organizationId,
            ),
        )
        return workos.http.json.decodeFromJsonElement(serializer<Page<Event>>(), json)
    }
}

class AuditLogs(private val workos: WorkOS) {
    suspend fun createEvent(organizationId: String, event: AuditLogEvent, idempotencyKey: String? = null): Boolean {
        workos.requireApiKey("auditLogs.createEvent")
        val json = workos.http.post(
            "/audit_logs/events",
            jsonBody(
                mapOf(
                    "organization_id" to organizationId,
                    "event" to mapOf(
                        "action" to event.action,
                        "occurred_at" to event.occurredAt,
                        "actor" to mapOf(
                            "id" to event.actor.id,
                            "type" to event.actor.type,
                            "name" to event.actor.name,
                        ),
                        "targets" to event.targets.map { target ->
                            mapOf(
                                "id" to target.id,
                                "type" to target.type,
                                "name" to target.name,
                            )
                        },
                        "context" to mapOf(
                            "location" to event.context.location,
                            "user_agent" to event.context.userAgent,
                        ),
                        "metadata" to event.metadata,
                    ),
                ),
            ),
            headers = if (idempotencyKey == null) emptyMap() else mapOf("Idempotency-Key" to idempotencyKey),
        )
        return json["success"]?.toString() != "false"
    }
}
