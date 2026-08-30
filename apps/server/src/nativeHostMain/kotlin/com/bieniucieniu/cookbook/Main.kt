package com.bieniucieniu.cookbook

import io.github.smyrgeorge.sqlx4k.ConnectionPool
import io.github.smyrgeorge.sqlx4k.postgres.postgreSQL
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.toKString
import kotlinx.coroutines.runBlocking
import platform.posix.F_OK
import platform.posix.access
import platform.posix.getenv

@OptIn(ExperimentalForeignApi::class)
private fun env(name: String): String? = getenv(name)?.toKString()

@OptIn(ExperimentalForeignApi::class)
private fun migrationPath(): String {
    env("DATABASE_MIGRATIONS")?.let { return it }
    val candidates = listOf("apps/server/db/migrations", "db/migrations")
    return candidates.firstOrNull { access(it, F_OK) == 0 }
        ?: error("No migrations dir. Set DATABASE_MIGRATIONS. Tried: $candidates")
}

fun main() {
    runBlocking {
        val db = postgreSQL(
            url = env("DATABASE_URL") ?: "postgresql://127.0.0.1:5432/cookbook",
            username = env("DATABASE_USER") ?: "cookbook",
            password = env("DATABASE_PASSWORD") ?: "cookbook",
            options = ConnectionPool.Options.builder().maxConnections(10).build(),
        )
        db.migrate(path = migrationPath()).getOrThrow()
        embeddedServer(CIO, port = 8080, host = "0.0.0.0") {
            module()
            configureRecipes(db)
        }.start(wait = true)
    }
}
