package com.bieniucieniu.cookbook.features.seed

import com.bieniucieniu.cookbook.app.httpModule
import com.bieniucieniu.cookbook.core.database.DatabaseConfig
import com.bieniucieniu.cookbook.core.database.databaseModule
import com.bieniucieniu.cookbook.core.database.migrationsDir
import com.bieniucieniu.cookbook.features.auth.Actor
import com.bieniucieniu.cookbook.features.auth.AuthRepository
import com.bieniucieniu.cookbook.features.auth.AGENT_EMAIL
import com.bieniucieniu.cookbook.features.auth.authModule
import com.bieniucieniu.cookbook.features.auth.nowSeconds
import com.bieniucieniu.cookbook.features.catalog.CatalogRepository
import com.bieniucieniu.cookbook.features.catalog.catalogModule
import com.bieniucieniu.cookbook.features.photos.S3Config
import com.bieniucieniu.cookbook.features.photos.photoModule
import com.bieniucieniu.cookbook.features.recipes.RecipeRepository
import com.bieniucieniu.cookbook.features.recipes.RecipeService
import com.bieniucieniu.cookbook.features.recipes.domain.EdgeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.GateMode
import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoRef
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeVisibility
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.SpanKind
import com.bieniucieniu.cookbook.features.recipes.domain.SpanWrite
import com.bieniucieniu.cookbook.features.recipes.domain.ToolHold
import com.bieniucieniu.cookbook.features.recipes.photoObjectKey
import com.bieniucieniu.cookbook.features.recipes.recipeModule
import com.bieniucieniu.cookbook.lib.utils.randomBytes
import com.bieniucieniu.cookbook.s3.PutObjectRequest
import com.bieniucieniu.cookbook.s3.S3Client
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.ktor.client.HttpClient
import kotlinx.coroutines.runBlocking
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module

const val EGGS_ON_TOAST = "Eggs on toast"

class Seed(
    private val catalog: CatalogRepository,
    private val users: AuthRepository,
    private val recipes: RecipeRepository,
    private val service: RecipeService,
    private val storage: S3Client,
    private val s3: S3Config,
) {
    suspend fun run() {
        val gluten = catalog.upsertAllergen("gluten", "Gluten")
        val egg = catalog.upsertIngredient("egg", "Egg")
        val tomato = catalog.upsertIngredient("tomato", "Tomato")
        val garlic = catalog.upsertIngredient("garlic", "Garlic")
        val cumin = catalog.upsertIngredient("cumin", "Cumin")
        val bread = catalog.upsertIngredient("bread", "Bread")
        val flour = catalog.upsertIngredient("flour", "Flour")
        catalog.linkIngredientAllergen(flour, gluten)
        val skillet = catalog.upsertTool("skillet", "Skillet")
        val oven = catalog.upsertTool("oven", "Oven")
        val seedUser = users.upsertUser("seed_local", "seed@localhost", "Seed", "Local")
        users.upsertUser("agent_local", AGENT_EMAIL, "Agent", "Local")
        if (recipes.idByTitle(EGGS_ON_TOAST) != null) return
        val storageKey = randomBytes(16).toHex()
        storage.putObject(
            PutObjectRequest(
                bucket = s3.bucket,
                key = photoObjectKey(storageKey),
                body = PNG,
                contentType = "image/png",
            ),
        )
        val photoId = recipes.insertPhoto(seedUser.id, storageKey, "image/png", nowSeconds())
        val saved = service.create(
            Actor(seedUser.id),
            eggsOnToast(egg, tomato, garlic, cumin, bread, skillet, oven, photoId),
            ownerId = null,
        )
        recipes.insertComment(saved.id, "sauce", seedUser.id, "Don't let the garlic brown.", 1_700_000_000)
        recipes.insertComment(saved.id, "sauce", seedUser.id, "A pinch more cumin is fine.", 1_700_000_060)
    }
}

fun seedMain() {
    val koin = startKoin {
        modules(
            databaseModule(),
            photoModule,
            httpModule,
            authModule,
            catalogModule,
            recipeModule,
            module { single { Seed(get(), get(), get(), get(), get(), get()) } },
        )
    }.koin
    try {
        runBlocking {
            val postgres = koin.get<IPostgresSQL>()
            try {
                val config = koin.get<DatabaseConfig>()
                if (config.autoMigrate) {
                    postgres.migrate(path = migrationsDir(), table = "_sqlx4k_migrations").getOrThrow()
                }
                koin.get<Seed>().run()
            } finally {
                runCatching { koin.get<HttpClient>().close() }
                postgres.close().getOrThrow()
            }
        }
    } finally {
        stopKoin()
    }
}

private fun eggsOnToast(
    egg: Long,
    tomato: Long,
    garlic: Long,
    cumin: Long,
    bread: Long,
    skillet: Long,
    oven: Long,
    photoId: Long,
) = RecipeWrite(
    title = EGGS_ON_TOAST,
    description = "Eggs, toast, and a quick tomato sauce. The sauce and the toast run together.",
    notes = "Salt the eggs, not the bread. The sauce can sit while the toast finishes.",
    cooks = 1,
    visibility = RecipeVisibility.Public,
    nodes = listOf(
        NodeWrite(
            key = "prep",
            title = "Prep",
            body = "Gather the eggs, bread, and sauce.",
            branchMode = GateMode.And,
            ord = 0,
        ),
        NodeWrite(
            key = "sauce",
            title = "Sauce",
            body = "Simmer tomato, garlic, and cumin.",
            ord = 1,
            spans = listOf(
                SpanWrite(0, SpanKind.Active, 300),
                SpanWrite(1, SpanKind.Wait, 1200),
            ),
            ingredients = listOf(
                NodeIngredientWrite(tomato),
                NodeIngredientWrite(garlic),
                NodeIngredientWrite(cumin, optional = true),
            ),
            tools = listOf(NodeToolWrite(skillet, hold = ToolHold.Span)),
        ),
        NodeWrite(
            key = "toast",
            title = "Toast",
            body = "Toast the bread.",
            ord = 2,
            spans = listOf(SpanWrite(0, SpanKind.Active, 480)),
            ingredients = listOf(NodeIngredientWrite(bread)),
        ),
        NodeWrite(
            key = "eggs",
            title = "Eggs",
            body = "Fry the eggs.",
            joinMode = GateMode.And,
            branchMode = GateMode.Xor,
            ord = 3,
            ingredients = listOf(NodeIngredientWrite(egg)),
        ),
        NodeWrite(key = "pan", title = "Pan", body = "Finish in the skillet.", ord = 4),
        NodeWrite(
            key = "broil",
            title = "Broil",
            body = "Or broil.",
            ord = 5,
            tools = listOf(NodeToolWrite(oven, hold = ToolHold.Span)),
        ),
        NodeWrite(
            key = "serve",
            title = "Serve",
            body = "Plate the eggs on the toast.",
            joinMode = GateMode.Xor,
            ord = 6,
        ),
    ),
    edges = listOf(
        EdgeWrite("prep", "sauce"),
        EdgeWrite("prep", "toast"),
        EdgeWrite("sauce", "eggs"),
        EdgeWrite("toast", "eggs"),
        EdgeWrite("eggs", "pan"),
        EdgeWrite("eggs", "broil"),
        EdgeWrite("pan", "serve"),
        EdgeWrite("broil", "serve"),
    ),
    photos = listOf(PhotoRef(photoId, "Eggs on toast")),
)

private val PNG: ByteArray = hex(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de" +
        "0000000c4944415408d763f8cfc00000000300010005fe02fe0000000049454e44ae426082",
)

private fun hex(text: String): ByteArray = ByteArray(text.length / 2) { index ->
    text.substring(index * 2, index * 2 + 2).toInt(16).toByte()
}

private fun ByteArray.toHex(): String = joinToString("") { byte ->
    (byte.toInt() and 0xff).toString(16).padStart(2, '0')
}
