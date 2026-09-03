package com.bieniucieniu.cookbook.features.auth

import com.workos.WorkOS
import org.koin.dsl.module

val authModule = module {
    single { WorkOS(get<WorkosConfig>().apiKey) }
    single { AuthService(get(), get()) }
}
