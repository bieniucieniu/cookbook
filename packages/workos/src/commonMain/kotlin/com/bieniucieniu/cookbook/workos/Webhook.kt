package com.bieniucieniu.cookbook.workos

import kotlin.time.Clock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

/**
 * Same job as `com.workos.webhooks.Webhook`: check the `WorkOS-Signature`
 * header and return the event JSON. Issued signatures are `t=<seconds>, v1=<hex>`.
 */
class Webhook(
    private val json: Json = Json { ignoreUnknownKeys = true },
) {
    fun constructEvent(
        payload: String,
        signatureHeader: String,
        secret: String,
        toleranceSeconds: Long = 180,
        nowSeconds: Long = Clock.System.now().epochSeconds,
    ): JsonObject {
        val parts = signatureHeader.split(',').map { it.trim() }
        val timestamp = parts.firstOrNull { it.startsWith("t=") }?.removePrefix("t=")?.toLongOrNull()
            ?: throw SignatureVerificationException("WorkOS signature is missing a timestamp")
        val skew = if (nowSeconds >= timestamp) nowSeconds - timestamp else timestamp - nowSeconds
        if (skew > toleranceSeconds) {
            throw SignatureVerificationException("WorkOS signature timestamp is outside the tolerance")
        }
        val expected = hmacSha256Hex(secret, "$timestamp.$payload")
        val signatures = parts.filter { it.startsWith("v1=") }.map { it.removePrefix("v1=") }
        if (signatures.none { secureEquals(it, expected) }) {
            throw SignatureVerificationException("WorkOS signature does not match")
        }
        val element = json.parseToJsonElement(payload)
        return element as? JsonObject ?: throw SignatureVerificationException("WorkOS webhook payload is not an object")
    }
}
