package com.bieniucieniu.cookbook

import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.ktor.server.application.Application
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.configureRecipes(db: IPostgresSQL) {
    routing {
        get("/recipes") {
            call.respond(RecipeRepositoryImpl.findAll(db).getOrThrow())
        }
    }
}
