package com.bieniucieniu.cookbook.features.catalog

import org.koin.dsl.module

val catalogModule = module {
    single { CatalogRepository(get(), get()) }
}
