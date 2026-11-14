package com.bieniucieniu.cookbook.features.auth

import com.bieniucieniu.cookbook.core.http.ErrorBody
import io.ktor.http.HttpStatusCode
import io.ktor.openapi.jsonSchema
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.openapi.describe
import io.ktor.utils.io.ExperimentalKtorApi
import org.koin.ktor.ext.inject

@OptIn(ExperimentalKtorApi::class)
fun Route.configureAuthRouting() {
    val auth: AuthService by inject()
    val sessions: SessionReader by inject()

    get("/auth/login") {
        call.redirect(auth.loginUrl())
    }.describe {
        operationId = "login"
        tag("auth")
        description = "Redirect to WorkOS AuthKit."
        responses {
            HttpStatusCode.Found { description = "Redirect to WorkOS" }
            HttpStatusCode.ServiceUnavailable { description = "WorkOS is not configured"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/auth/callback") {
        auth.callback(call)
    }.describe {
        operationId = "authCallback"
        tag("auth")
        description = "Exchange the AuthKit code and start a local session."
        responses {
            HttpStatusCode.Found { description = "Session cookie set" }
            HttpStatusCode.BadRequest { description = "Missing or expired login"; schema = jsonSchema<ErrorBody>() }
            HttpStatusCode.ServiceUnavailable { description = "WorkOS is not configured"; schema = jsonSchema<ErrorBody>() }
        }
    }

    get("/auth/me") {
        call.respond(auth.me(sessions.actor(call)))
    }.describe {
        operationId = "currentUser"
        tag("auth")
        responses {
            HttpStatusCode.OK { description = "Signed-in user"; schema = jsonSchema<MeResponse>() }
            HttpStatusCode.Unauthorized { description = "No session"; schema = jsonSchema<ErrorBody>() }
        }
    }

    post("/auth/logout") {
        auth.logout(call)
    }.describe {
        operationId = "logout"
        tag("auth")
        description = "Delete the local session and redirect."
        responses {
            HttpStatusCode.Found { description = "Logged out" }
        }
    }
}
