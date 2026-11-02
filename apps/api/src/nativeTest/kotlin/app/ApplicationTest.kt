package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.health.configureHealth
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.http.configureStatusPages
import com.bieniucieniu.cookbook.core.openapi.configureOpenApi
import com.bieniucieniu.cookbook.features.auth.SessionReader
import com.bieniucieniu.cookbook.features.recipes.configureRecipeRouting
import io.ktor.client.request.get
import io.ktor.server.application.install
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import org.koin.dsl.module
import org.koin.ktor.plugin.Koin

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
        assertEquals(true, body.contains("\"/recipes/{id}\""))
        assertEquals(true, body.contains("\"/ingredients\""))
        assertEquals(true, body.contains("\"/tools\""))
        assertEquals(true, body.contains("\"/allergens\""))
        assertEquals(true, body.contains("listRecipes"))
        assertEquals(true, body.contains("createRecipe"))
        assertEquals(true, body.contains("listIngredients"))
        assertEquals(true, body.contains("listTools"))
        assertEquals(true, body.contains("listAllergens"))
        assertEquals(true, body.contains("\"/auth/login\""))
        assertEquals(true, body.contains("\"/recipes/{id}/grants\""))
        assertEquals(true, body.contains("\"/photos\""))
        assertEquals(true, body.contains("\"/recipes/{id}/comments\""))
        assertEquals(true, body.contains("RecipeWrite"))
        assertEquals(true, body.contains("GrantWrite"))
        assertEquals(true, body.contains("NamedWrite"))
        assertEquals(true, body.contains("AllergenSet"))
        assertEquals(true, body.contains("IngredientAltSet"))
        assertEquals(true, body.contains("ToolAltSet"))
        assertEquals(true, body.contains("CommentWrite"))
        assertEquals(true, body.contains("PhotoUpload"))
        assertEquals(false, body.contains("documentation.json"))
        assertEquals(false, body.contains("\"/mcp\""))
        assertEquals(false, body.contains("oauth-protected-resource"))
    }

    @Test
    fun postRecipeWithoutSessionIsUnauthorized() = testApplication {
        application {
            val app = this
            configureSerialization()
            configureStatusPages()
            app.install(Koin) {
                modules(module {
                    single<SessionReader> { SessionReader { null } }
                })
            }
            routing {
                configureRecipeRouting()
            }
        }
        val response = client.post("/recipes")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }
}
