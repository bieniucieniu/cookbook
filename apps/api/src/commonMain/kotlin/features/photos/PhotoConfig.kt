package com.bieniucieniu.cookbook.features.photos

import com.bieniucieniu.cookbook.lib.utils.env

data class S3Config(
    val endpoint: String,
    val bucket: String,
    val accessKey: String,
    val secretKey: String,
) {
    companion object {
        fun fromEnv() = S3Config(
            endpoint = env("S3_ENDPOINT") ?: "http://127.0.0.1:8333",
            bucket = env("S3_BUCKET") ?: "cookbook",
            accessKey = env("S3_ACCESS_KEY") ?: "cookbook",
            secretKey = env("S3_SECRET_KEY") ?: "cookbook",
        )
    }
}

data class PhotoConfig(val maxBytes: Long) {
    companion object {
        const val DEFAULT_MAX_BYTES = 5_242_880L

        fun fromEnv() = PhotoConfig(env("PHOTO_MAX_BYTES")?.toLongOrNull() ?: DEFAULT_MAX_BYTES)
    }
}

private val imageTypes = setOf("image/jpeg", "image/png", "image/webp")

fun imageContentType(raw: String?): String? {
    val base = raw?.substringBefore(';')?.trim()?.lowercase() ?: return null
    return base.takeIf { it in imageTypes }
}

fun photoRejection(size: Int, contentType: String?, maxBytes: Long): String? {
    val type = imageContentType(contentType)
    if (type == null) return "photo must be jpeg, png, or webp"
    if (size <= 0) return "photo is empty"
    if (size.toLong() > maxBytes) return "photo is larger than $maxBytes bytes"
    return null
}
