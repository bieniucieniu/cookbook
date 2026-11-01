package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.features.auth.configureAuthRouting
import com.bieniucieniu.cookbook.features.catalog.configureCatalogRouting
import com.bieniucieniu.cookbook.features.photos.configurePhotoRouting
import com.bieniucieniu.cookbook.features.recipes.configureRecipeRouting
import io.ktor.server.application.Application
import io.ktor.server.routing.routing

fun Application.configureRouting() {
    routing {
        configureAuthRouting()
        configureCatalogRouting()
        configurePhotoRouting()
        configureRecipeRouting()
    }
}
