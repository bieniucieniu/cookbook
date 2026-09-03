package com.bieniucieniu.cookbook.core.database

import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationStopping
import io.ktor.server.application.log
import org.koin.core.module.Module
import org.koin.dsl.module
import org.koin.ktor.ext.get
import org.koin.ktor.ext.getKoin
import javax.sql.DataSource

fun Application.configureDatabase() {
    val config: DatabaseConfig? = getKoin().getOrNull()
    if (config == null || !config.isEnabled) {
        log.info("Database disabled, no JDBC URL provided")
        return
    }

    val dataSource: DataSource = get()
    if (config.autoMigrate) {
        migrate(dataSource)
        log.info("Database migrated")
    } else {
        log.info("Database auto-migrate disabled (AUTO_MIGRATE=false)")
    }

    monitor.subscribe(ApplicationStopping) {
        (dataSource as? HikariDataSource)?.close()
    }
}

fun databaseModule(builder: DatabaseConfigBuilder.() -> Unit): Module =
    databaseModule(DatabaseConfigBuilder().apply(builder).build())

fun databaseModule(config: DatabaseConfig): Module = module {
    if (!config.isEnabled) {
        return@module
    }

    single { config }

    single<HikariDataSource> {
        HikariDataSource(config.toHikariConfig())
    }

    single<DataSource> {
        get<HikariDataSource>()
    }
}
