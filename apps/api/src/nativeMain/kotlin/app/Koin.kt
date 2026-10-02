package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.database.databaseModule
import com.bieniucieniu.cookbook.features.recipes.recipeModule
import io.ktor.server.application.Application
import io.ktor.server.application.install
import org.koin.core.logger.Level
import org.koin.core.logger.PrintLogger
import org.koin.ktor.plugin.Koin

fun Application.configureKoin() {
    install(Koin) {
        logger(PrintLogger(level = Level.DEBUG))
        modules(
            databaseModule(),
            recipeModule,
        )
        createEagerInstances()
    }
}
