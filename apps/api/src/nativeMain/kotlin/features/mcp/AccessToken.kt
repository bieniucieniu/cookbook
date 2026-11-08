package com.bieniucieniu.cookbook.features.mcp

import dev.whyoleg.cryptography.CryptographyProvider
import dev.whyoleg.cryptography.algorithms.RSA
import dev.whyoleg.cryptography.algorithms.SHA256
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/** The claims the MCP route needs from a verified AuthKit access token. */
data class TokenClaims(val subject: String, val expiresAt: Long?)

/** A JWT split into its parts. Null when it is not three base64url segments with JSON header and payload. */
internal data class Jwt(
    val header: JsonObject,
    val payload: JsonObject,
    val signedPart: ByteArray,
    val signature: ByteArray,
)

private val tokenJson = Json { ignoreUnknownKeys = true }

@OptIn(ExperimentalEncodingApi::class)
private val base64Url = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT_OPTIONAL)

@OptIn(ExperimentalEncodingApi::class)
internal fun base64UrlDecode(value: String): ByteArray? = try {
    base64Url.decode(value)
} catch (_: IllegalArgumentException) {
    null
}

internal fun parseJwt(token: String): Jwt? {
    val parts = token.split('.')
    if (parts.size != 3 || parts.any { it.isEmpty() }) return null
    val header = base64UrlDecode(parts[0])?.let { jsonObject(it) } ?: return null
    val payload = base64UrlDecode(parts[1])?.let { jsonObject(it) } ?: return null
    val signature = base64UrlDecode(parts[2]) ?: return null
    return Jwt(header, payload, "${parts[0]}.${parts[1]}".encodeToByteArray(), signature)
}

private fun jsonObject(bytes: ByteArray): JsonObject? = try {
    tokenJson.parseToJsonElement(bytes.decodeToString()) as? JsonObject
} catch (_: Throwable) {
    null
}

private fun JsonObject.string(name: String): String? = (this[name] as? JsonPrimitive)?.contentOrNull

private fun JsonObject.long(name: String): Long? = (this[name] as? JsonPrimitive)?.longOrNull

/**
 * Claim checks on a token whose signature already passed: issuer is the AuthKit domain, the audience
 * holds this MCP resource, and it is inside its validity window (60 s leeway for clock skew).
 */
internal fun checkClaims(payload: JsonObject, issuer: String, resource: String, now: Long): TokenClaims? {
    if (payload.string("iss")?.trimEnd('/') != issuer.trimEnd('/')) return null
    val audiences = when (val aud = payload["aud"]) {
        is JsonArray -> aud.mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
        is JsonPrimitive -> listOfNotNull(aud.contentOrNull)
        else -> emptyList()
    }
    if (resource !in audiences) return null
    val leeway = 60L
    val exp = payload.long("exp")
    if (exp == null || exp + leeway <= now) return null
    val nbf = payload.long("nbf")
    if (nbf != null && nbf - leeway > now) return null
    val subject = payload.string("sub")?.takeIf { it.isNotBlank() } ?: return null
    return TokenClaims(subject, exp)
}

/** DER of a PKCS#1 RSAPublicKey (`SEQUENCE { INTEGER n, INTEGER e }`) from JWK `n` and `e` bytes. */
internal fun pkcs1PublicKeyDer(modulus: ByteArray, exponent: ByteArray): ByteArray {
    fun integer(value: ByteArray): ByteArray {
        val significant = value.dropWhile { it == 0.toByte() }.toByteArray()
        val trimmed = if (significant.isEmpty()) byteArrayOf(0) else significant
        // A set high bit would read as negative: prefix a zero byte.
        val body = if (trimmed[0].toInt() and 0x80 != 0) byteArrayOf(0) + trimmed else trimmed
        return byteArrayOf(0x02) + derLength(body.size) + body
    }
    val content = integer(modulus) + integer(exponent)
    return byteArrayOf(0x30) + derLength(content.size) + content
}

private fun derLength(length: Int): ByteArray {
    if (length < 0x80) return byteArrayOf(length.toByte())
    val bytes = mutableListOf<Byte>()
    var rest = length
    while (rest > 0) {
        bytes.add(0, (rest and 0xFF).toByte())
        rest = rest shr 8
    }
    return byteArrayOf((0x80 or bytes.size).toByte()) + bytes.toByteArray()
}

/** Turns one JWKS entry into a verifying key, or null when it is not an RS256 signing key. */
internal suspend fun rsaKeyFromJwk(jwk: JsonObject): RSA.PKCS1.PublicKey? {
    if (jwk.string("kty") != "RSA") return null
    jwk.string("use")?.let { if (it != "sig") return null }
    jwk.string("alg")?.let { if (it != "RS256") return null }
    val modulus = jwk.string("n")?.let(::base64UrlDecode) ?: return null
    val exponent = jwk.string("e")?.let(::base64UrlDecode) ?: return null
    return try {
        CryptographyProvider.Default.get(RSA.PKCS1)
            .publicKeyDecoder(SHA256)
            .decodeFromByteArray(RSA.PublicKey.Format.DER.PKCS1, pkcs1PublicKeyDer(modulus, exponent))
    } catch (_: Throwable) {
        null
    }
}

/**
 * Verifies AuthKit access tokens locally (docs/AGENTS.md, MCP). Keys come from the AuthKit JWKS,
 * cached by `kid`. An unknown `kid` refetches the set, at most once a minute, so key rotation works
 * without a restart and a stream of junk tokens cannot hammer AuthKit.
 */
class AccessTokenVerifier(
    private val issuer: String,
    private val resource: String,
    private val fetchJwks: suspend () -> JsonObject?,
    private val now: () -> Long,
) {
    private val keys = mutableMapOf<String, RSA.PKCS1.PublicKey>()
    private var fetchedAt = Long.MIN_VALUE
    private val mutex = Mutex()

    suspend fun verify(token: String): TokenClaims? {
        val jwt = parseJwt(token) ?: return null
        if (jwt.header.string("alg") != "RS256") return null
        val kid = jwt.header.string("kid") ?: return null
        val key = key(kid) ?: return null
        val valid = try {
            key.signatureVerifier().tryVerifySignature(jwt.signedPart, jwt.signature)
        } catch (_: Throwable) {
            false
        }
        if (!valid) return null
        return checkClaims(jwt.payload, issuer, resource, now())
    }

    private suspend fun key(kid: String): RSA.PKCS1.PublicKey? = mutex.withLock {
        keys[kid]?.let { return@withLock it }
        val current = now()
        if (fetchedAt != Long.MIN_VALUE && current - fetchedAt < 60) return@withLock null
        fetchedAt = current
        val set = fetchJwks() ?: return@withLock null
        val fresh = mutableMapOf<String, RSA.PKCS1.PublicKey>()
        for (entry in (set["keys"] as? JsonArray).orEmpty()) {
            val jwk = entry as? JsonObject ?: continue
            val id = jwk.string("kid") ?: continue
            rsaKeyFromJwk(jwk)?.let { fresh[id] = it }
        }
        if (fresh.isNotEmpty()) {
            keys.clear()
            keys.putAll(fresh)
        }
        keys[kid]
    }
}
