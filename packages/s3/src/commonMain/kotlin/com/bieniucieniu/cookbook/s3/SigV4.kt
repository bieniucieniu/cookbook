package com.bieniucieniu.cookbook.s3

import io.ktor.http.Url
import io.ktor.http.encodeURLParameter
import io.ktor.http.hostWithPortIfSpecified
import kotlin.time.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.format
import kotlinx.datetime.format.char
import kotlinx.datetime.toLocalDateTime
import org.kotlincrypto.hash.sha2.SHA256
import org.kotlincrypto.macs.hmac.sha2.HmacSHA256

internal fun sha256(bytes: ByteArray): ByteArray = SHA256().digest(bytes)

internal fun sha256Hex(bytes: ByteArray): String = sha256(bytes).toHexString()

internal fun hmacSha256(key: ByteArray, message: ByteArray): ByteArray = HmacSHA256(key).doFinal(message)

private val AmzStamp = LocalDateTime.Format {
    date(LocalDate.Formats.ISO_BASIC)
    char('T')
    hour()
    minute()
    second()
    char('Z')
}

internal fun amzTimestamp(epochSeconds: Long): AmzTime {
    val time = Instant.fromEpochSeconds(epochSeconds).toLocalDateTime(TimeZone.UTC)
    return AmzTime(LocalDate.Formats.ISO_BASIC.format(time.date), AmzStamp.format(time))
}

internal data class AmzTime(val date: String, val stamp: String)

internal fun endpointHost(endpoint: String): String = Url(endpoint).hostWithPortIfSpecified

internal fun encodePath(path: String): String =
    path.split('/').joinToString("/") { it.encodeURLParameter() }

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
    val signature = hmacSha256(signingKey, stringToSign.encodeToByteArray()).toHexString()
    val authorization = "AWS4-HMAC-SHA256 Credential=$accessKey/$scope, SignedHeaders=$signed, Signature=$signature"
    return SignedHeaders(headers, authorization)
}

private fun signingKey(secret: String, date: String, region: String): ByteArray {
    val dateKey = hmacSha256("AWS4$secret".encodeToByteArray(), date.encodeToByteArray())
    val regionKey = hmacSha256(dateKey, region.encodeToByteArray())
    val serviceKey = hmacSha256(regionKey, "s3".encodeToByteArray())
    return hmacSha256(serviceKey, "aws4_request".encodeToByteArray())
}
