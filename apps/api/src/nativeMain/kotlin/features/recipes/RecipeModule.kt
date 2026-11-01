package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.photos.S3Config
import org.koin.dsl.module

val recipeModule = module {
    single { RecipeRepository(get(), get()) }
    single {
        RecipeService(get(), get(), get(), get(), get<S3Config>().bucket)
    }
}
