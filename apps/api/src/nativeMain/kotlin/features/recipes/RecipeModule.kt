package com.bieniucieniu.cookbook.features.recipes

import org.koin.dsl.module

val recipeModule = module {
    single { RecipeRepository(get()) }
}
