package com.bieniucieniu.cookbook.core.database

import com.bieniucieniu.cookbook.db.CookbookDatabase
import com.bieniucieniu.cookbook.lib.utils.directoryExists
import com.bieniucieniu.cookbook.lib.utils.env
import io.github.smyrgeorge.sqlx4k.ConnectionPool
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.github.smyrgeorge.sqlx4k.postgres.postgreSQL
import io.github.smyrgeorge.sqlx4k.sqldelight.Sqlx4kSqldelightDriver
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopping
import io.ktor.server.application.log
import kotlinx.coroutines.runBlocking
import org.koin.core.module.Module
import org.koin.dsl.module
import org.koin.ktor.ext.get

fun Application.configureDatabase() {
    val config = get<DatabaseConfig>()
    val postgres = get<IPostgresSQL>()
    if (config.autoMigrate) {
        val directory = migrationsDir()
        runBlocking {
            postgres.migrate(
                path = directory,
                table = "_sqlx4k_migrations",
            ).getOrThrow()
        }
        log.info("Database migrated")
    } else {
        log.info("Database auto-migrate disabled (AUTO_MIGRATE=false)")
    }

    monitor.subscribe(ApplicationStopping) {
        runBlocking {
            postgres.close().getOrThrow()
        }
    }
}

fun databaseModule(): Module = module {
    single { DatabaseConfig.fromEnv() }

    single<IPostgresSQL> {
        val config = get<DatabaseConfig>()
        val options = ConnectionPool.Options.builder()
            .maxConnections(config.maximumPoolSize)
            .build()
        postgreSQL(
            url = config.url,
            username = config.username,
            password = config.password,
            options = options,
        )
    }

    single {
        CookbookDatabase(Sqlx4kSqldelightDriver(get<IPostgresSQL>()))
    }
}

fun migrationsDir(): String {
    env("DATABASE_MIGRATIONS")?.let { return it }
    val candidates = listOf("apps/api/db/migrations", "db/migrations")
    return candidates.firstOrNull { directoryExists(it) }
        ?: error("No migrations dir. Set DATABASE_MIGRATIONS. Tried: $candidates")
}
