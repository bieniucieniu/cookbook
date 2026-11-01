package com.bieniucieniu.cookbook.lib.utils

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.toKString
import kotlinx.cinterop.usePinned
import platform.posix.closedir
import platform.posix.fclose
import platform.posix.fopen
import platform.posix.fread
import platform.posix.getenv
import platform.posix.opendir

@OptIn(ExperimentalForeignApi::class)
fun env(name: String): String? = getenv(name)?.toKString()?.takeIf { it.isNotBlank() }

@OptIn(ExperimentalForeignApi::class)
fun randomBytes(size: Int): ByteArray {
    val file = fopen("/dev/urandom", "rb") ?: error("cannot open /dev/urandom")
    try {
        val buffer = ByteArray(size)
        val read = buffer.usePinned { pinned ->
            fread(pinned.addressOf(0), 1u, size.toULong(), file).toInt()
        }
        if (read != size) error("short read from /dev/urandom")
        return buffer
    } finally {
        fclose(file)
    }
}

@OptIn(ExperimentalForeignApi::class)
fun directoryExists(path: String): Boolean {
    val dir = opendir(path) ?: return false
    closedir(dir)
    return true
}
