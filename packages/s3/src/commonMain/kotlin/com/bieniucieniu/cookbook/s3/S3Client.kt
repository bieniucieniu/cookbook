package com.bieniucieniu.cookbook.s3

import io.ktor.client.HttpClient
import io.ktor.client.request.header
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsBytes
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.content.ByteArrayContent
import io.ktor.http.isSuccess
import kotlin.time.Clock

/**
 * Native stand-in for `aws.sdk.kotlin.services.s3.S3Client`.
 * The official client is JVM. This one speaks path-style SigV4 for
 * [putObject], [getObject], and [deleteObject]. The caller owns [http]
 * and this class does not close it.
 */
class S3Client(
    private val http: HttpClient,
    private val endpoint: String,
    private val accessKey: String,
    private val secretKey: String,
    private val region: String = "us-east-1",
    private val nowSeconds: () -> Long = { Clock.System.now().epochSeconds },
) {
    suspend fun putObject(request: PutObjectRequest): PutObjectResponse {
        exchange(HttpMethod.Put, request.bucket, request.key, request.body, request.contentType)
        return PutObjectResponse()
    }

    suspend fun getObject(request: GetObjectRequest): GetObjectResponse {
        val response = exchange(HttpMethod.Get, request.bucket, request.key, EMPTY, contentType = null)
        return GetObjectResponse(
            body = response.bodyAsBytes(),
            contentType = response.headers[HttpHeaders.ContentType],
        )
    }

    suspend fun deleteObject(request: DeleteObjectRequest): DeleteObjectResponse {
        exchange(HttpMethod.Delete, request.bucket, request.key, EMPTY, contentType = null)
        return DeleteObjectResponse()
    }

    private suspend fun exchange(
        method: HttpMethod,
        bucket: String,
        key: String,
        body: ByteArray,
        contentType: String?,
    ): HttpResponse {
        val canonicalUri = "/" + encodePath("$bucket/$key")
        val url = endpoint.trimEnd('/') + canonicalUri
        val signed = sigV4(
            method = method.value,
            canonicalUri = canonicalUri,
            host = endpointHost(endpoint),
            payload = body,
            contentType = contentType,
            accessKey = accessKey,
            secretKey = secretKey,
            region = region,
            epochSeconds = nowSeconds(),
        )
        val response = http.request(url) {
            this.method = method
            for ((name, value) in signed.canonical) {
                header(name, value)
            }
            header(HttpHeaders.Authorization, signed.authorization)
            if (body.isNotEmpty() || method == HttpMethod.Put) {
                val type = contentType?.let { io.ktor.http.ContentType.parse(it) }
                setBody(ByteArrayContent(body, type))
            }
        }
        if (!response.status.isSuccess()) {
            throw S3Exception(response.status.value, "$method $canonicalUri failed (${response.status.value})")
        }
        return response
    }

    private companion object {
        val EMPTY = ByteArray(0)
    }
}

class PutObjectRequest(
    val bucket: String,
    val key: String,
    val body: ByteArray,
    val contentType: String? = null,
)

class PutObjectResponse

class GetObjectRequest(
    val bucket: String,
    val key: String,
)

class GetObjectResponse(
    val body: ByteArray,
    val contentType: String?,
)

class DeleteObjectRequest(
    val bucket: String,
    val key: String,
)

class DeleteObjectResponse

class S3Exception(val status: Int, message: String) : RuntimeException(message)
