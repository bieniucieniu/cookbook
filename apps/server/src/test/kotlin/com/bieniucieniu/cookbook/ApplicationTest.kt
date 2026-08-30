package com.bieniucieniu.cookbook

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
            module()
        }
        val response = client.get("/")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("Hello, Ktor!", response.bodyAsText())
    }

    @Test
    fun testHealth() = testApplication {
        application {
            module()
        }
        val response = client.get("/health")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("ok", response.bodyAsText())
    }

    @Test
    fun recipesUnauthorizedWithoutCookie() = testApplication {
        application {
            module()
            routing {
                get("/recipes") {
                    call.requireUser(WorkOS("sk_test"), "client_test", cookieSecure = false) ?: return@get
                }
            }
        }
        val response = client.get("/recipes")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun swaggerYaml() = testApplication {
        application {
            module()
        }
        val response = client.get("/swagger/documentation.yaml")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(true, response.bodyAsText().startsWith("openapi:"))
    }
}
