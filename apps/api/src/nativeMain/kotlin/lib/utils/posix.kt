package com.bieniucieniu.cookbook.lib.utils

import io.ktor.client.engine.HttpClientEngineConfig
import io.ktor.client.engine.HttpClientEngineFactory
import io.ktor.client.engine.curl.Curl
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.toKString
import platform.posix.closedir
import platform.posix.getenv
import platform.posix.opendir

@OptIn(ExperimentalForeignApi::class)
actual fun env(name: String): String? = getenv(name)?.toKString()?.takeIf { it.isNotBlank() }

@OptIn(ExperimentalForeignApi::class)
actual fun directoryExists(path: String): Boolean {
    val dir = opendir(path) ?: return false
    closedir(dir)
    return true
}

actual val httpEngine: HttpClientEngineFactory<HttpClientEngineConfig> = Curl
