package com.bieniucieniu.cookbook.core.health

import com.bieniucieniu.cookbook.sayHello
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.openapi.jsonSchema
import io.ktor.server.application.Application
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.openapi.describe
import io.ktor.server.routing.routing
import io.ktor.utils.io.ExperimentalKtorApi

@OptIn(ExperimentalKtorApi::class)
fun Application.configureHealth() {
    routing {
        get("/") {
            call.respondText(sayHello("Ktor"))
        }.describe {
            operationId = "getRoot"
            tag("meta")
            responses {
                HttpStatusCode.OK {
                    description = "Greeting"
                    ContentType.Text.Plain {
                        schema = jsonSchema<String>()
                    }
                }
            }
        }
        get("/health") {
            call.respondText("ok")
        }.describe {
            operationId = "getHealth"
            tag("meta")
            responses {
                HttpStatusCode.OK {
                    description = "Liveness"
                    ContentType.Text.Plain {
                        schema = jsonSchema<String>()
                    }
                }
            }
        }
    }
}
