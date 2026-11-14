package com.bieniucieniu.cookbook.workos

import kotlin.io.encoding.Base64
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.kotlincrypto.hash.sha2.SHA256
import org.kotlincrypto.macs.hmac.sha2.HmacSHA256

fun interface SecureBytes {
    fun nextBytes(size: Int): ByteArray
}

private val Base64UrlEncoder = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT)
private val Base64UrlDecoder = Base64.UrlSafe.withPadding(Base64.PaddingOption.ABSENT_OPTIONAL)

fun base64Url(bytes: ByteArray): String = Base64UrlEncoder.encode(bytes)

fun base64UrlDecode(text: String): ByteArray = Base64UrlDecoder.decode(text)

fun sha256(bytes: ByteArray): ByteArray = SHA256().digest(bytes)

fun sha256Hex(text: String): String = sha256(text.encodeToByteArray()).toHexString()

fun pkceS256(verifier: String): String = base64Url(sha256(verifier.encodeToByteArray()))

fun hmacSha256(key: ByteArray, message: ByteArray): ByteArray = HmacSHA256(key).doFinal(message)

fun hmacSha256Hex(key: String, message: String): String =
    hmacSha256(key.encodeToByteArray(), message.encodeToByteArray()).toHexString()

fun secureEquals(left: String, right: String): Boolean {
    val a = left.encodeToByteArray()
    val b = right.encodeToByteArray()
    if (a.size != b.size) return false
    var diff = 0
    for (index in a.indices) diff = diff or (a[index].toInt() xor b[index].toInt())
    return diff == 0
}

fun sessionIdFromAccessToken(accessToken: String): String? = try {
    val payload = accessToken.split('.').getOrNull(1) ?: return null
    Json.parseToJsonElement(base64UrlDecode(payload).decodeToString())
        .jsonObject["sid"]?.jsonPrimitive?.contentOrNull
} catch (_: Exception) {
    null
}
