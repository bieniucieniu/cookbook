package com.bieniucieniu.cookbook.lib.utils

import kotlinx.cinterop.ByteVar
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.allocArray
import kotlinx.cinterop.get
import kotlinx.cinterop.memScoped
import kotlinx.cinterop.toKString
import platform.posix.closedir
import platform.posix.fclose
import platform.posix.fopen
import platform.posix.fread
import platform.posix.fseek
import platform.posix.ftell
import platform.posix.getenv
import platform.posix.opendir
import platform.posix.rewind
import platform.posix.SEEK_END

@OptIn(ExperimentalForeignApi::class)
fun env(name: String): String? = getenv(name)?.toKString()?.takeIf { it.isNotBlank() }

@OptIn(ExperimentalForeignApi::class)
fun fileExists(path: String): Boolean = fopen(path, "rb")?.let { file ->
    fclose(file)
    true
} ?: false

@OptIn(ExperimentalForeignApi::class)
fun directoryExists(path: String): Boolean {
    val dir = opendir(path) ?: return false
    closedir(dir)
    return true
}

@OptIn(ExperimentalForeignApi::class)
fun readText(path: String): String {
    val file = fopen(path, "rb") ?: error("Cannot open $path")
    try {
        if (fseek(file, 0, SEEK_END) != 0) error("Cannot seek $path")
        val size = ftell(file)
        if (size < 0) error("Cannot size $path")
        rewind(file)
        if (size == 0L) return ""
        val length = size.toInt()
        val bytes = ByteArray(length)
        memScoped {
            val buf = allocArray<ByteVar>(length)
            val read = fread(buf, 1u, size.toULong(), file).toLong()
            if (read != size) error("Short read $path")
            for (index in 0 until length) {
                bytes[index] = buf[index]
            }
        }
        return bytes.decodeToString()
    } finally {
        fclose(file)
    }
}
