package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.health.configureHealth
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.openapi.configureOpenApi
import com.bieniucieniu.cookbook.features.auth.AuthService
import com.bieniucieniu.cookbook.features.auth.WorkosConfig
import com.bieniucieniu.cookbook.features.auth.requireUser
import com.workos.WorkOS
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals

class ApplicationTest {

    @Test
    fun testRoot() = testApplication {
        application {
            configureHealth()
        }
        val response = client.get("/")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("Hello, Ktor!", response.bodyAsText())
    }

    @Test
    fun testHealth() = testApplication {
        application {
            configureHealth()
        }
        val response = client.get("/health")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("ok", response.bodyAsText())
    }

    @Test
    fun recipesUnauthorizedWithoutCookie() = testApplication {
        application {
            configureSerialization()
            routing {
                get("/recipes") {
                    call.requireUser(
                        AuthService(
                            WorkOS("sk_test"),
                            WorkosConfig(
                                apiKey = "sk_test",
                                clientId = "client_test",
                                cookieSecure = false,
                            ),
                        ),
                    ) ?: return@get
                }
            }
        }
        val response = client.get("/recipes")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun swaggerYaml() = testApplication {
        application {
            configureOpenApi()
        }
        val response = client.get("/swagger/documentation.yaml")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(true, response.bodyAsText().startsWith("openapi:"))
    }
}
