package com.bieniucieniu.cookbook

import com.workos.WorkOS
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer

fun main() {
    val workos = WorkOS(requireEnv("WORKOS_API_KEY"))
    val clientId = requireEnv("WORKOS_CLIENT_ID")
    val cookiePassword = requireEnv("WORKOS_COOKIE_PASSWORD")
    require(cookiePassword.length >= 32) { "WORKOS_COOKIE_PASSWORD must be 32+ characters" }
    val cookieSecure = System.getenv("WORKOS_COOKIE_SECURE") == "true"
    val dataSource = HikariDataSource(
        HikariConfig().apply {
            jdbcUrl = toJdbcUrl(
                System.getenv("DATABASE_URL") ?: "postgresql://127.0.0.1:5432/cookbook",
            )
            username = System.getenv("DATABASE_USER") ?: "cookbook"
            password = System.getenv("DATABASE_PASSWORD") ?: "cookbook"
        },
    )
    migrate(dataSource, migrationDir())
    val recipes = RecipeRepository(dataSource)
    embeddedServer(CIO, port = 8080, host = "0.0.0.0") {
        module()
        configureAuth(workos, clientId, cookieSecure)
        configureRecipes(recipes, workos, clientId, cookieSecure)
    }.start(wait = true)
}

private fun requireEnv(name: String): String =
    System.getenv(name)?.takeIf { it.isNotBlank() }
        ?: error("Missing $name")
