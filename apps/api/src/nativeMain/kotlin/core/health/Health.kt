package com.bieniucieniu.cookbook.core.health

import com.bieniucieniu.cookbook.sayHello
import io.ktor.server.application.Application
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing

fun Application.configureHealth() {
    routing {
        get("/") {
            call.respondText(sayHello("Ktor"))
        }
        get("/health") {
            call.respondText("ok")
        }
    }
}
