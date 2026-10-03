package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.health.configureHealth
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.openapi.configureOpenApi
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
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
    fun swaggerJson() = testApplication {
        application {
            configureSerialization()
            configureHealth()
            configureRouting()
            configureOpenApi()
        }
        val response = client.get("/swagger/documentation.json")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertEquals(true, body.contains("\"openapi\""))
        assertEquals(true, body.contains("\"/recipes\""))
        assertEquals(true, body.contains("listRecipes"))
        assertEquals(false, body.contains("documentation.json"))
    }
}
