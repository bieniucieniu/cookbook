package com.bieniucieniu.cookbook.features.photos

import org.koin.dsl.module

val photoModule = module {
    single { PhotoConfig.fromEnv() }
    single { S3Config.fromEnv() }
    single { PhotoService(get(), get(), get(), get()) }
}
