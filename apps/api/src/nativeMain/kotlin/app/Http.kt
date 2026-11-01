package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.features.photos.S3Config
import com.bieniucieniu.cookbook.s3.S3Client
import io.ktor.client.HttpClient
import io.ktor.client.engine.curl.Curl
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import org.koin.dsl.module

val httpModule = module {
    single {
        HttpClient(Curl) {
            install(ContentNegotiation) {
                json(
                    Json {
                        ignoreUnknownKeys = true
                        explicitNulls = false
                    },
                )
            }
        }
    }
    single {
        val config = get<S3Config>()
        S3Client(
            http = get(),
            endpoint = config.endpoint,
            accessKey = config.accessKey,
            secretKey = config.secretKey,
        )
    }
}
