package com.bieniucieniu.cookbook.features.mcp

import dev.whyoleg.cryptography.CryptographyProvider
import dev.whyoleg.cryptography.algorithms.RSA
import dev.whyoleg.cryptography.algorithms.SHA256
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertNull

@OptIn(ExperimentalEncodingApi::class)
class AccessTokenTest {
    private val issuer = "https://auth.example.test"
    private val resource = "https://cookbook.example.test/api/v1/mcp"
    private val now = 1_800_000_000L

    private fun b64(bytes: ByteArray) = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT).encode(bytes)

    private suspend fun keyPair() =
        CryptographyProvider.Default.get(RSA.PKCS1).keyPairGenerator(digest = SHA256).generateKey()

    /** Reads `SEQUENCE { INTEGER n, INTEGER e }` back into its two integers. */
    private fun pkcs1Parts(der: ByteArray): Pair<ByteArray, ByteArray> {
        var at = 0
        fun length(): Int {
            val first = der[at++].toInt() and 0xFF
            if (first < 0x80) return first
            var value = 0
            repeat(first and 0x7F) { value = (value shl 8) or (der[at++].toInt() and 0xFF) }
            return value
        }
        check(der[at++] == 0x30.toByte())
        length()
        fun integer(): ByteArray {
            check(der[at++] == 0x02.toByte())
            val size = length()
            return der.copyOfRange(at, at + size).also { at += size }
        }
        return integer() to integer()
    }

    private suspend fun jwks(key: RSA.PKCS1.PublicKey, kid: String): JsonObject {
        val (n, e) = pkcs1Parts(key.encodeToByteArray(RSA.PublicKey.Format.DER.PKCS1))
        return buildJsonObject {
            put("keys", buildJsonArray {
                add(buildJsonObject {
                    put("kty", "RSA")
                    put("use", "sig")
                    put("alg", "RS256")
                    put("kid", kid)
                    put("n", b64(n))
                    put("e", b64(e))
                })
            })
        }
    }

    private suspend fun sign(
        key: RSA.PKCS1.PrivateKey,
        claims: JsonObject,
        kid: String = "k1",
        alg: String = "RS256",
    ): String {
        val header = b64(buildJsonObject { put("alg", alg); put("kid", kid); put("typ", "JWT") }.toString().encodeToByteArray())
        val payload = b64(claims.toString().encodeToByteArray())
        val signature = key.signatureGenerator().generateSignature("$header.$payload".encodeToByteArray())
        return "$header.$payload.${b64(signature)}"
    }

    private fun claims(
        aud: String = resource,
        iss: String = issuer,
        exp: Long = now + 300,
        sub: String = "user_01",
    ) = buildJsonObject {
        put("iss", iss)
        put("aud", aud)
        put("exp", exp)
        put("iat", now)
        put("sub", sub)
    }

    private fun verifier(set: JsonObject, fetches: MutableList<Long> = mutableListOf()) =
        AccessTokenVerifier(issuer, resource, { fetches += now; set }, { now })

    @Test
    fun derEncoderMatchesTheLibrary() = runTest {
        val der = keyPair().publicKey.encodeToByteArray(RSA.PublicKey.Format.DER.PKCS1)
        val (n, e) = pkcs1Parts(der)
        assertContentEquals(der, pkcs1PublicKeyDer(n, e))
    }

    @Test
    fun acceptsAValidToken() = runTest {
        val pair = keyPair()
        val token = sign(pair.privateKey, claims())
        assertEquals(TokenClaims("user_01", now + 300), verifier(jwks(pair.publicKey, "k1")).verify(token))
    }

    @Test
    fun acceptsAnAudienceArray() = runTest {
        val pair = keyPair()
        val payload = buildJsonObject {
            put("iss", issuer)
            put("aud", buildJsonArray { add(JsonPrimitive("other")); add(JsonPrimitive(resource)) })
            put("exp", now + 300)
            put("sub", "user_01")
        }
        assertEquals("user_01", verifier(jwks(pair.publicKey, "k1")).verify(sign(pair.privateKey, payload))?.subject)
    }

    @Test
    fun rejectsWrongAudienceIssuerOrExpiry() = runTest {
        val pair = keyPair()
        val check = verifier(jwks(pair.publicKey, "k1"))
        assertNull(check.verify(sign(pair.privateKey, claims(aud = "https://cookbook.example.test/api/mcp"))))
        assertNull(check.verify(sign(pair.privateKey, claims(iss = "https://evil.example.test"))))
        assertNull(check.verify(sign(pair.privateKey, claims(exp = now - 120))))
        assertNull(check.verify(sign(pair.privateKey, claims(sub = ""))))
    }

    @Test
    fun rejectsAForeignSignatureAndOtherAlgorithms() = runTest {
        val trusted = keyPair()
        val stranger = keyPair()
        val check = verifier(jwks(trusted.publicKey, "k1"))
        assertNull(check.verify(sign(stranger.privateKey, claims())))
        assertNull(check.verify(sign(trusted.privateKey, claims(), alg = "none")))
        assertNull(check.verify("not.a.jwt"))
        assertNull(check.verify("garbage"))
    }

    @Test
    fun unknownKidRefetchesAtMostOncePerMinute() = runTest {
        val pair = keyPair()
        val fetches = mutableListOf<Long>()
        val check = verifier(jwks(pair.publicKey, "k1"), fetches)
        assertNull(check.verify(sign(pair.privateKey, claims(), kid = "rotated")))
        assertNull(check.verify(sign(pair.privateKey, claims(), kid = "rotated")))
        assertEquals(1, fetches.size)
    }
}
