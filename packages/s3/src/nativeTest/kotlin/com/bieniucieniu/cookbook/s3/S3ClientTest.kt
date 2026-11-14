package com.bieniucieniu.cookbook.s3

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import kotlinx.coroutines.runBlocking
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class S3ClientTest {
    @Test
    fun putObjectSignsPathStyle() = runBlocking {
        var method = HttpMethod.Get
        var url = ""
        var authorization = ""
        var payloadHash = ""
        var amzDate = ""
        var host = ""
        var contentType = ""
        val http = HttpClient(MockEngine { request ->
            method = request.method
            url = request.url.toString()
            authorization = request.headers[HttpHeaders.Authorization].orEmpty()
            payloadHash = request.headers["x-amz-content-sha256"].orEmpty()
            amzDate = request.headers["x-amz-date"].orEmpty()
            host = request.headers[HttpHeaders.Host].orEmpty()
            val body = request.body as OutgoingContent.ByteArrayContent
            contentType = body.contentType?.toString().orEmpty()
            assertEquals("hello", body.bytes().decodeToString())
            respond("", HttpStatusCode.OK)
        })
        val client = S3Client(
            http = http,
            endpoint = "http://127.0.0.1:8333",
            accessKey = "cookbook",
            secretKey = "cookbook",
            nowSeconds = { 1_793_556_000L },
        )
        client.putObject(
            PutObjectRequest(
                bucket = "cookbook",
                key = "photos/abc",
                body = "hello".encodeToByteArray(),
                contentType = "image/png",
            ),
        )
        assertEquals(HttpMethod.Put, method)
        assertEquals("http://127.0.0.1:8333/cookbook/photos/abc", url)
        assertEquals("127.0.0.1:8333", host)
        assertEquals("image/png", contentType)
        assertEquals("20261101T180000Z", amzDate)
        assertEquals("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", payloadHash)
        assertEquals(
            "AWS4-HMAC-SHA256 Credential=cookbook/20261101/us-east-1/s3/aws4_request, " +
                "SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, " +
                "Signature=bc9d8785e69b23a0f57fc7d907355d95cff340eb592eed6a7cc40ccbb6d2be12",
            authorization,
        )
        http.close()
    }

    @Test
    fun hmacSha256MatchesRfc4231() {
        val key = ByteArray(20) { 0x0b }
        assertEquals(
            "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
            hmacSha256(key, "Hi There".encodeToByteArray()).toHexString(),
        )
    }

    @Test
    fun timestampIsUtc() {
        assertEquals(AmzTime("20261101", "20261101T180000Z"), amzTimestamp(1_793_556_000L))
        assertTrue(endpointHost("http://127.0.0.1:8333").contains("8333"))
    }

    @Test
    fun timestampHandlesLeapDayAndPreEpoch() {
        assertEquals(AmzTime("20240229", "20240229T235959Z"), amzTimestamp(1_709_251_199L))
        assertEquals(AmzTime("19691231", "19691231T235959Z"), amzTimestamp(-1L))
    }

    @Test
    fun endpointHostDropsDefaultPorts() {
        assertEquals("127.0.0.1:8333", endpointHost("http://127.0.0.1:8333/"))
        assertEquals("s3.example", endpointHost("https://s3.example:443"))
        assertEquals("s3.example", endpointHost("http://s3.example"))
    }

    @Test
    fun encodePathKeepsOnlyUnreservedCharacters() {
        assertEquals("bucket/a%20b%2Bc/%C5%BC%C3%B3%C5%82w-_.~", encodePath("bucket/a b+c/żółw-_.~"))
    }
}
