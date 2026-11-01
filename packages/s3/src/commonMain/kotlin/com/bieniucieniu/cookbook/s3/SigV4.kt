package com.bieniucieniu.cookbook.s3

import org.kotlincrypto.hash.sha2.SHA256

internal fun sha256(bytes: ByteArray): ByteArray = SHA256().digest(bytes)

internal fun sha256Hex(bytes: ByteArray): String = sha256(bytes).toHex()

internal fun hmacSha256(key: ByteArray, message: ByteArray): ByteArray {
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

internal fun ByteArray.toHex(): String = joinToString("") { byte ->
    (byte.toInt() and 0xff).toString(16).padStart(2, '0')
}

internal fun amzTimestamp(epochSeconds: Long): AmzTime {
    val days = floorDiv(epochSeconds, 86400)
    val rem = floorMod(epochSeconds, 86400).toInt()
    val hour = rem / 3600
    val minute = (rem % 3600) / 60
    val second = rem % 60
    val (year, month, day) = civilFromDays(days)
    val date = year.pad4() + month.pad2() + day.pad2()
    val stamp = date + "T" + hour.pad2() + minute.pad2() + second.pad2() + "Z"
    return AmzTime(date, stamp)
}

internal data class AmzTime(val date: String, val stamp: String)

internal fun endpointHost(endpoint: String): String {
    val scheme = endpoint.substringBefore("://", "http")
    val rest = endpoint.trimEnd('/').substringAfter("://", endpoint.trimEnd('/'))
    val hostPort = rest.substringBefore('/')
    val colon = hostPort.lastIndexOf(':')
    val host = if (colon >= 0) hostPort.substring(0, colon) else hostPort
    val port = if (colon >= 0) hostPort.substring(colon + 1) else ""
    val omit = (scheme == "http" && (port.isEmpty() || port == "80")) ||
        (scheme == "https" && (port.isEmpty() || port == "443"))
    return if (omit || port.isEmpty()) host else "$host:$port"
}

internal fun encodePath(path: String): String =
    path.split('/').joinToString("/") { segment ->
        buildString(segment.length) {
            for (byte in segment.encodeToByteArray()) {
                val value = byte.toInt() and 0xff
                val char = value.toChar()
                if (char.isLetterOrDigit() || char == '-' || char == '_' || char == '.' || char == '~') {
                    append(char)
                } else {
                    append('%')
                    append(value.toString(16).uppercase().padStart(2, '0'))
                }
            }
        }
    }

internal data class SignedHeaders(
    val canonical: List<Pair<String, String>>,
    val authorization: String,
)

internal fun sigV4(
    method: String,
    canonicalUri: String,
    host: String,
    payload: ByteArray,
    contentType: String?,
    accessKey: String,
    secretKey: String,
    region: String,
    epochSeconds: Long,
): SignedHeaders {
    val time = amzTimestamp(epochSeconds)
    val payloadHash = sha256Hex(payload)
    val headers = buildList {
        if (contentType != null) add("content-type" to contentType)
        add("host" to host)
        add("x-amz-content-sha256" to payloadHash)
        add("x-amz-date" to time.stamp)
    }.sortedBy { it.first }
    val canonicalHeaders = headers.joinToString("") { (name, value) -> "$name:${value.trim()}\n" }
    val signed = headers.joinToString(";") { it.first }
    val canonical = listOf(
        method,
        canonicalUri,
        "",
        canonicalHeaders,
        signed,
        payloadHash,
    ).joinToString("\n")
    val scope = "${time.date}/$region/s3/aws4_request"
    val stringToSign = listOf(
        "AWS4-HMAC-SHA256",
        time.stamp,
        scope,
        sha256Hex(canonical.encodeToByteArray()),
    ).joinToString("\n")
    val signingKey = signingKey(secretKey, time.date, region)
    val signature = hmacSha256(signingKey, stringToSign.encodeToByteArray()).toHex()
    val authorization = "AWS4-HMAC-SHA256 Credential=$accessKey/$scope, SignedHeaders=$signed, Signature=$signature"
    return SignedHeaders(headers, authorization)
}

private fun signingKey(secret: String, date: String, region: String): ByteArray {
    val dateKey = hmacSha256("AWS4$secret".encodeToByteArray(), date.encodeToByteArray())
    val regionKey = hmacSha256(dateKey, region.encodeToByteArray())
    val serviceKey = hmacSha256(regionKey, "s3".encodeToByteArray())
    return hmacSha256(serviceKey, "aws4_request".encodeToByteArray())
}

private fun Int.pad2(): String = toString().padStart(2, '0')

private fun Int.pad4(): String = toString().padStart(4, '0')

private fun floorDiv(value: Long, divisor: Long): Long {
    var result = value / divisor
    if (value < 0 && value % divisor != 0L) result -= 1
    return result
}

private fun floorMod(value: Long, divisor: Long): Long = value - floorDiv(value, divisor) * divisor

private fun civilFromDays(daysSinceEpoch: Long): Triple<Int, Int, Int> {
    val z = daysSinceEpoch + 719468
    val era = if (z >= 0) z / 146097 else (z - 146096) / 146097
    val doe = (z - era * 146097).toInt()
    val yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
    val y = yoe + era.toInt() * 400
    val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    val mp = (5 * doy + 2) / 153
    val day = doy - (153 * mp + 2) / 5 + 1
    val month = mp + if (mp < 10) 3 else -9
    val year = y + if (month <= 2) 1 else 0
    return Triple(year, month, day)
}
