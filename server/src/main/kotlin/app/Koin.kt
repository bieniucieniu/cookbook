package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.database.DatabaseConfig
import com.bieniucieniu.cookbook.core.database.databaseModule
import com.bieniucieniu.cookbook.features.auth.WorkosConfig
import com.bieniucieniu.cookbook.features.auth.authModule
import com.bieniucieniu.cookbook.features.recipes.recipeModule
import com.bieniucieniu.cookbook.lib.utils.configOrNull
import io.ktor.server.application.Application
import io.ktor.server.application.install
import org.koin.core.logger.Level
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin
import org.koin.logger.slf4jLogger

fun Application.configureKoin() {
    install(Koin) {
        slf4jLogger(level = Level.DEBUG)
        modules(
            databaseModule {
                config = DatabaseConfig.from(environment.config.configOrNull("database"))
            },
            module {
                single { WorkosConfig.from(environment.config.configOrNull("workos")) }
            },
            authModule,
            recipeModule,
        )
    }
}
