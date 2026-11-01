package com.bieniucieniu.cookbook.workos

import org.kotlincrypto.hash.sha2.SHA256

fun interface SecureBytes {
    fun nextBytes(size: Int): ByteArray
}

private const val Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

fun base64Url(bytes: ByteArray): String {
    val out = StringBuilder(((bytes.size + 2) / 3) * 4)
    var index = 0
    while (index < bytes.size) {
        val first = bytes[index].toInt() and 0xff
        val second = if (index + 1 < bytes.size) bytes[index + 1].toInt() and 0xff else 0
        val third = if (index + 2 < bytes.size) bytes[index + 2].toInt() and 0xff else 0
        out.append(Alphabet[first shr 2])
        out.append(Alphabet[((first and 0x03) shl 4) or (second shr 4)])
        if (index + 1 < bytes.size) out.append(Alphabet[((second and 0x0f) shl 2) or (third shr 6)])
        if (index + 2 < bytes.size) out.append(Alphabet[third and 0x3f])
        index += 3
    }
    return out.toString()
}

fun base64UrlDecode(text: String): ByteArray {
    val clean = buildString(text.length) {
        for (char in text) {
            if (char != '=' && !char.isWhitespace()) append(char)
        }
    }
    val out = ArrayList<Byte>(clean.length * 3 / 4)
    var buffer = 0
    var bits = 0
    for (char in clean) {
        val value = Alphabet.indexOf(char)
        if (value < 0) error("bad base64url")
        buffer = (buffer shl 6) or value
        bits += 6
        if (bits >= 8) {
            bits -= 8
            out.add(((buffer shr bits) and 0xff).toByte())
        }
    }
    return out.toByteArray()
}

fun sha256(bytes: ByteArray): ByteArray = SHA256().digest(bytes)

fun sha256Hex(text: String): String = sha256(text.encodeToByteArray()).toHex()

fun pkceS256(verifier: String): String = base64Url(sha256(verifier.encodeToByteArray()))

fun hmacSha256(key: ByteArray, message: ByteArray): ByteArray {
    val block = 64
    val normalized = if (key.size > block) sha256(key) else key
    val ipad = ByteArray(block) { index ->
        ((if (index < normalized.size) normalized[index].toInt() else 0) xor 0x36).toByte()
    }
    val opad = ByteArray(block) { index ->
        ((if (index < normalized.size) normalized[index].toInt() else 0) xor 0x5c).toByte()
    }
    return sha256(opad + sha256(ipad + message))
}

fun hmacSha256Hex(key: String, message: String): String =
    hmacSha256(key.encodeToByteArray(), message.encodeToByteArray()).toHex()

internal fun ByteArray.toHex(): String = joinToString("") { byte ->
    (byte.toInt() and 0xff).toString(16).padStart(2, '0')
}

fun secureEquals(left: String, right: String): Boolean {
    val a = left.encodeToByteArray()
    val b = right.encodeToByteArray()
    if (a.size != b.size) return false
    var diff = 0
    for (index in a.indices) diff = diff or (a[index].toInt() xor b[index].toInt())
    return diff == 0
}

fun sessionIdFromAccessToken(accessToken: String): String? {
    val payload = accessToken.split('.').getOrNull(1) ?: return null
    val text = try {
        base64UrlDecode(payload).decodeToString()
    } catch (_: Throwable) {
        return null
    }
    val key = "\"sid\""
    val start = text.indexOf(key)
    if (start < 0) return null
    val colon = text.indexOf(':', start + key.length)
    if (colon < 0) return null
    val quote = text.indexOf('"', colon + 1)
    if (quote < 0) return null
    val end = text.indexOf('"', quote + 1)
    if (end < 0) return null
    return text.substring(quote + 1, end)
}
