package com.bieniucieniu.cookbook.lib.utils

import io.ktor.client.engine.HttpClientEngineConfig
import io.ktor.client.engine.HttpClientEngineFactory

expect fun env(name: String): String?

expect fun directoryExists(path: String): Boolean

expect val httpEngine: HttpClientEngineFactory<HttpClientEngineConfig>
