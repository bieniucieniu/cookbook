package com.bieniucieniu.cookbook

import java.io.File
import javax.sql.DataSource

fun migrate(dataSource: DataSource, directory: File) {
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

fun toJdbcUrl(raw: String): String =
    if (raw.startsWith("jdbc:")) raw else raw.replaceFirst(Regex("^postgresql:"), "jdbc:postgresql:")

fun migrationDir(): File {
    System.getenv("DATABASE_MIGRATIONS")?.let { return File(it) }
    val candidates = listOf("apps/server/db/migrations", "db/migrations")
    return candidates.map(::File).firstOrNull { it.isDirectory }
        ?: error("No migrations dir. Set DATABASE_MIGRATIONS. Tried: $candidates")
}
