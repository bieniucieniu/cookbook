package com.bieniucieniu.cookbook

import com.bieniucieniu.cookbook.app.configureKoin
import com.bieniucieniu.cookbook.app.configureRouting
import com.bieniucieniu.cookbook.features.auth.configureHttpShutdown
import com.bieniucieniu.cookbook.features.seed.seedMain
import com.bieniucieniu.cookbook.core.database.configureDatabase
import com.bieniucieniu.cookbook.core.health.configureHealth
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.http.configureStatusPages
import com.bieniucieniu.cookbook.core.openapi.configureOpenApi
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import kotlin.native.runtime.GC
import kotlin.native.runtime.NativeRuntimeApi

@OptIn(NativeRuntimeApi::class)
private fun capNativeHeap() {
    // The runtime sizes itself from host RAM. The Pi shows ~4GiB, so the heap
    // blows past the container limit during startup. Keep it inside the pod.
    GC.autotune = false
    GC.minHeapBytes = 8L * 1024 * 1024
    GC.maxHeapBytes = 192L * 1024 * 1024
    GC.targetHeapBytes = 96L * 1024 * 1024
}

fun main(args: Array<String>) {
    capNativeHeap()
    if (args.firstOrNull() == "seed") {
        seedMain()
        return
    }
    embeddedServer(CIO, port = 8080, host = "0.0.0.0") {
        configureKoin()
        configureHttpShutdown()
        configureSerialization()
        configureStatusPages()
        configureOpenApi()
        configureDatabase()
        configureHealth()
        configureRouting()
    }.start(wait = true)
}
