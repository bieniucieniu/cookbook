package com.bieniucieniu.cookbook.core.database

import com.bieniucieniu.cookbook.lib.utils.stringOrNull
import com.zaxxer.hikari.HikariConfig
import io.ktor.server.config.ApplicationConfig

data class DatabaseConfig(
    val jdbcUrl: String?,
    val username: String? = null,
    val password: String? = null,
    val maximumPoolSize: Int = 10,
    val autoMigrate: Boolean = true,
) {
    val isEnabled: Boolean
        get() = jdbcUrl != null

    fun toHikariConfig(): HikariConfig =
        HikariConfig().apply {
            jdbcUrl = this@DatabaseConfig.jdbcUrl
            username = this@DatabaseConfig.username
            password = this@DatabaseConfig.password
            maximumPoolSize = this@DatabaseConfig.maximumPoolSize
            driverClassName = "org.postgresql.Driver"
        }

    companion object {
        fun from(config: ApplicationConfig?) = DatabaseConfig(
            jdbcUrl = config?.stringOrNull("jdbcUrl")?.let(::toJdbcUrl),
            username = config?.stringOrNull("username"),
            password = config?.stringOrNull("password"),
            maximumPoolSize = config?.propertyOrNull("maximumPoolSize")?.getString()?.toIntOrNull() ?: 10,
            autoMigrate = config?.propertyOrNull("autoMigrate")?.getString()?.toBooleanStrictOrNull() ?: true,
        )
    }
}

class DatabaseConfigBuilder {
    lateinit var config: DatabaseConfig

    fun build(): DatabaseConfig = config
}

fun toJdbcUrl(raw: String): String =
    if (raw.startsWith("jdbc:")) raw else raw.replaceFirst(Regex("^postgresql:"), "jdbc:postgresql:")
