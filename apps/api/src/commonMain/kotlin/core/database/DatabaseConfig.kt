package com.bieniucieniu.cookbook.core.database

import com.bieniucieniu.cookbook.lib.utils.env

data class DatabaseConfig(
    val url: String,
    val username: String,
    val password: String,
    val maximumPoolSize: Int = 10,
    val autoMigrate: Boolean = true,
) {
    companion object {
        fun fromEnv() = DatabaseConfig(
            url = env("DATABASE_URL") ?: "postgresql://127.0.0.1:5432/cookbook",
            username = env("DATABASE_USER") ?: "cookbook",
            password = env("DATABASE_PASSWORD") ?: "cookbook",
            maximumPoolSize = env("DATABASE_MAX_POOL_SIZE")?.toIntOrNull() ?: 10,
            autoMigrate = env("AUTO_MIGRATE")?.toBooleanStrictOrNull() ?: true,
        )
    }
}
