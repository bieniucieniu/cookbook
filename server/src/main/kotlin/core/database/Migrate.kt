package com.bieniucieniu.cookbook.core.database

import java.io.File
import javax.sql.DataSource

fun migrate(dataSource: DataSource, directory: File = migrationDir()) {
    val scripts = directory.listFiles { file -> file.isFile && file.extension == "sql" }
        ?.sortedBy { it.name }
        ?: error("No SQL files in $directory")
    dataSource.connection.use { connection ->
        connection.createStatement().use { statement ->
            for (script in scripts) {
                statement.execute(script.readText())
            }
        }
    }
}

fun migrationDir(): File {
    System.getenv("DATABASE_MIGRATIONS")?.let { return File(it) }
    val candidates = listOf("server/db/migrations", "db/migrations")
    return candidates.map(::File).firstOrNull { it.isDirectory }
        ?: error("No migrations dir. Set DATABASE_MIGRATIONS. Tried: $candidates")
}
