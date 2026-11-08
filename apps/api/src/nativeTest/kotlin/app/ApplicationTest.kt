package com.bieniucieniu.cookbook.app

import com.bieniucieniu.cookbook.core.health.configureHealthRouting
import com.bieniucieniu.cookbook.core.http.configureSerialization
import com.bieniucieniu.cookbook.core.http.configureStatusPages
import com.bieniucieniu.cookbook.features.auth.SessionReader
import com.bieniucieniu.cookbook.features.recipes.configureRecipeRouting
import io.ktor.client.request.get
import io.ktor.server.application.install
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.route
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
            routing { route(ApiVersion.V1) { configureHealthRouting() } }
        }
        val response = client.get("/api/v1")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("Hello, Ktor!", response.bodyAsText())
    }

    @Test
    fun testHealth() = testApplication {
        application {
            routing { route(ApiVersion.V1) { configureHealthRouting() } }
        }
        val response = client.get("/api/v1/health")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("ok", response.bodyAsText())
    }

    @Test
    fun swaggerJson() = testApplication {
        application {
            configureSerialization()
            configureRouting()
        }
        val response = client.get("/api/v1/swagger/documentation.json")
        assertEquals(HttpStatusCode.OK, response.status)
        val body = response.bodyAsText()
        assertEquals(true, body.contains("\"openapi\""))
        assertEquals(true, body.contains("\"/api/v1/recipes\""))
        assertEquals(true, body.contains("\"/api/v1/recipes/{id}\""))
        assertEquals(true, body.contains("\"/api/v1/ingredients\""))
        assertEquals(true, body.contains("\"/api/v1/tools\""))
        assertEquals(true, body.contains("\"/api/v1/allergens\""))
        assertEquals(true, body.contains("listRecipes"))
        assertEquals(true, body.contains("createRecipe"))
        assertEquals(true, body.contains("listIngredients"))
        assertEquals(true, body.contains("listTools"))
        assertEquals(true, body.contains("listAllergens"))
        assertEquals(true, body.contains("\"/api/v1/auth/login\""))
        assertEquals(true, body.contains("\"/api/v1/recipes/{id}/grants\""))
        assertEquals(true, body.contains("\"/api/v1/photos\""))
        assertEquals(true, body.contains("\"/api/v1/recipes/{id}/comments\""))
        assertEquals(true, body.contains("RecipeWrite"))
        assertEquals(true, body.contains("GrantWrite"))
        assertEquals(true, body.contains("NamedWrite"))
        assertEquals(true, body.contains("AllergenSet"))
        assertEquals(true, body.contains("IngredientAltSet"))
        assertEquals(true, body.contains("ToolAltSet"))
        assertEquals(true, body.contains("CommentWrite"))
        assertEquals(true, body.contains("PhotoUpload"))
        assertEquals(false, body.contains("documentation.json"))
        assertEquals(false, body.contains("\"/api/v1/mcp\""))
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
                route(ApiVersion.V1) { configureRecipeRouting() }
            }
        }
        val response = client.post("/api/v1/recipes")
        assertEquals(HttpStatusCode.Unauthorized, response.status)
    }

    @Test
    fun unversionedPathsAreGone() = testApplication {
        application {
            configureSerialization()
            configureRouting()
        }
        assertEquals(HttpStatusCode.NotFound, client.get("/health").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/recipes").status)
        assertEquals(HttpStatusCode.NotFound, client.get("/swagger/documentation.json").status)
        assertEquals(HttpStatusCode.OK, client.get("/api/v1/health").status)
    }
}
