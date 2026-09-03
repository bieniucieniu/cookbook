package com.bieniucieniu.cookbook.lib.utils

import io.ktor.server.config.ApplicationConfig

fun ApplicationConfig.stringOrNull(key: String): String? =
    propertyOrNull(key)?.getString()?.takeIf { it.isNotBlank() }

fun ApplicationConfig.configOrNull(key: String): ApplicationConfig? =
    try {
        config(key)
    } catch (_: Exception) {
        null
    }
