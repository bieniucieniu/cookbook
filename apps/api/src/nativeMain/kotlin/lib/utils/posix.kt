package com.bieniucieniu.cookbook.lib.utils

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.toKString
import platform.posix.closedir
import platform.posix.getenv
import platform.posix.opendir

@OptIn(ExperimentalForeignApi::class)
fun env(name: String): String? = getenv(name)?.toKString()?.takeIf { it.isNotBlank() }

@OptIn(ExperimentalForeignApi::class)
fun directoryExists(path: String): Boolean {
    val dir = opendir(path) ?: return false
    closedir(dir)
    return true
}
