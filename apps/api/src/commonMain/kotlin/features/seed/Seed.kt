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
import com.bieniucieniu.cookbook.features.recipes.domain.IngredientSwapWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeIngredientWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeToolWrite
import com.bieniucieniu.cookbook.features.recipes.domain.NodeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.PhotoRef
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeVisibility
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeWrite
import com.bieniucieniu.cookbook.features.recipes.domain.SpanKind
import com.bieniucieniu.cookbook.features.recipes.domain.SpanWrite
import com.bieniucieniu.cookbook.features.recipes.domain.ToolHold
import com.bieniucieniu.cookbook.features.recipes.domain.ToolSwapWrite
import com.bieniucieniu.cookbook.features.recipes.photoObjectKey
import com.bieniucieniu.cookbook.features.recipes.recipeModule
import com.bieniucieniu.cookbook.s3.PutObjectRequest
import com.bieniucieniu.cookbook.s3.S3Client
import dev.whyoleg.cryptography.random.CryptographyRandom
import io.github.smyrgeorge.sqlx4k.postgres.IPostgresSQL
import io.ktor.client.HttpClient
import kotlinx.coroutines.runBlocking
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin
import org.koin.dsl.module

const val EGGS_ON_TOAST = "Eggs on toast"
const val THAI_RED_CURRY = "Thai Red Curry"

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
        if (recipes.idByTitle(EGGS_ON_TOAST) == null) {
            seedEggsOnToast(seedUser.id, egg, tomato, garlic, cumin, bread, skillet, oven)
        }
        if (recipes.idByTitle(THAI_RED_CURRY) == null) {
            service.create(Actor(seedUser.id), thaiRedCurry(garlic), ownerId = null)
        }
    }

    private suspend fun seedEggsOnToast(
        seedUserId: Long,
        egg: Long,
        tomato: Long,
        garlic: Long,
        cumin: Long,
        bread: Long,
        skillet: Long,
        oven: Long,
    ) {
        val storageKey = CryptographyRandom.nextBytes(16).toHexString()
        storage.putObject(
            PutObjectRequest(
                bucket = s3.bucket,
                key = photoObjectKey(storageKey),
                body = PNG,
                contentType = "image/png",
            ),
        )
        val photoId = recipes.insertPhoto(seedUserId, storageKey, "image/png", nowSeconds())
        val saved = service.create(
            Actor(seedUserId),
            eggsOnToast(egg, tomato, garlic, cumin, bread, skillet, oven, photoId),
            ownerId = null,
        )
        recipes.insertComment(saved.id, "sauce", seedUserId, "Don't let the garlic brown.", 1_700_000_000)
        recipes.insertComment(saved.id, "sauce", seedUserId, "A pinch more cumin is fine.", 1_700_000_060)
    }

    private suspend fun thaiRedCurry(garlic: Long): RecipeWrite {
        val coconutMilk = catalog.upsertIngredient("coconut-milk", "Full-fat coconut milk")
        val chickenStock = catalog.upsertIngredient("chicken-stock", "Chicken stock")
        val vegetableStock = catalog.upsertIngredient("vegetable-stock", "Vegetable stock")
        val redCurryPaste = catalog.upsertIngredient("red-curry-paste", "Red curry paste")
        val ginger = catalog.upsertIngredient("ginger", "Ginger")
        val lemongrass = catalog.upsertIngredient("lemongrass", "Lemongrass")
        val chickenThighs = catalog.upsertIngredient("chicken-thighs", "Chicken thighs")
        val beef = catalog.upsertIngredient("beef", "Beef")
        val shrimp = catalog.upsertIngredient("shrimp", "Shrimp")
        val firmTofu = catalog.upsertIngredient("firm-tofu", "Firm tofu")
        val thaiEggplant = catalog.upsertIngredient("thai-eggplant", "Thai eggplant")
        val bambooShoots = catalog.upsertIngredient("bamboo-shoots", "Bamboo shoots")
        val redBellPepper = catalog.upsertIngredient("red-bell-pepper", "Red bell pepper")
        val greenBeans = catalog.upsertIngredient("green-beans", "Green beans")
        val kaffirLimeLeaves = catalog.upsertIngredient("kaffir-lime-leaves", "Kaffir lime leaves")
        val thaiBasil = catalog.upsertIngredient("thai-basil", "Thai basil")
        val fishSauce = catalog.upsertIngredient("fish-sauce", "Fish sauce")
        val palmSugar = catalog.upsertIngredient("palm-sugar", "Palm sugar")
        val brownSugar = catalog.upsertIngredient("brown-sugar", "Brown sugar")
        val vegetableOil = catalog.upsertIngredient("vegetable-oil", "Vegetable oil")
        val jasmineRice = catalog.upsertIngredient("jasmine-rice", "Jasmine rice")
        val wok = catalog.upsertTool("wok", "Wok")
        val deepPan = catalog.upsertTool("deep-pan", "Deep pan")

        fun wokUse(hold: ToolHold = ToolHold.Active) =
            listOf(NodeToolWrite(wok, hold = hold, alts = listOf(ToolSwapWrite(deepPan))))

        return RecipeWrite(
            title = THAI_RED_CURRY,
            description = "A quick Thai red curry: fry the paste, simmer it in coconut milk and stock, " +
                "cook your protein and vegetables in the sauce, then finish with Thai basil and kaffir lime leaves.",
            notes = "Use 2 tbsp of curry paste for a milder curry and up to 4 tbsp for a hot one. " +
                "Mae Ploy and Maesri are popular paste brands. " +
                "Use 1–2 cups of stock depending on how thick you want the sauce. " +
                "Sources: themodernproper.com, rasamalaysia.com, hungryinthailand.com, loveandlemons.com, " +
                "cuisineatlas.com, recipetineats.com, bbcgoodfood.com.",
            cooks = 1,
            visibility = RecipeVisibility.Public,
            nodes = listOf(
                NodeWrite(
                    key = "saute-paste",
                    title = "Sauté the paste",
                    body = "Heat a splash of oil (or a few spoons of the thick cream from the top of the coconut " +
                        "milk can) in the pan. Add the red curry paste with the minced garlic, ginger and " +
                        "lemongrass, and fry for about 2 minutes, until fragrant and the oil separates.",
                    ord = 0,
                    spans = listOf(SpanWrite(0, SpanKind.Active, 120)),
                    ingredients = listOf(
                        NodeIngredientWrite(vegetableOil, 1.0, "tbsp"),
                        NodeIngredientWrite(redCurryPaste, 3.0, "tbsp"),
                        NodeIngredientWrite(garlic, 2.0, "clove"),
                        NodeIngredientWrite(ginger, 1.0, "tbsp"),
                        NodeIngredientWrite(lemongrass, 1.0, "stalk"),
                    ),
                    tools = wokUse(),
                ),
                NodeWrite(
                    key = "simmer-sauce",
                    title = "Simmer the sauce",
                    body = "Pour in the remaining coconut milk and the stock, then stir in the fish sauce and " +
                        "palm sugar. Bring to a simmer.",
                    ord = 1,
                    spans = listOf(SpanWrite(0, SpanKind.Active, 120)),
                    ingredients = listOf(
                        NodeIngredientWrite(coconutMilk, 400.0, "ml"),
                        NodeIngredientWrite(
                            chickenStock, 360.0, "ml",
                            alts = listOf(IngredientSwapWrite(vegetableStock)),
                        ),
                        NodeIngredientWrite(fishSauce, 2.0, "tbsp"),
                        NodeIngredientWrite(palmSugar, 1.0, "tbsp", alts = listOf(IngredientSwapWrite(brownSugar))),
                    ),
                    tools = wokUse(),
                ),
                NodeWrite(
                    key = "cook-protein-veg",
                    title = "Cook protein and vegetables",
                    body = "Add the chicken (or your protein of choice) along with the longer-cooking vegetables: " +
                        "Thai eggplant, bamboo shoots and green beans. Simmer for 10–12 minutes, until the " +
                        "protein is cooked through and the vegetables are tender.",
                    ord = 2,
                    spans = listOf(SpanWrite(0, SpanKind.Wait, 660)),
                    ingredients = listOf(
                        NodeIngredientWrite(
                            chickenThighs, 450.0, "g",
                            alts = listOf(
                                IngredientSwapWrite(beef),
                                IngredientSwapWrite(shrimp),
                                IngredientSwapWrite(firmTofu),
                            ),
                        ),
                        NodeIngredientWrite(thaiEggplant, 150.0, "g"),
                        NodeIngredientWrite(bambooShoots, 100.0, "g"),
                        NodeIngredientWrite(greenBeans, 100.0, "g"),
                    ),
                    tools = wokUse(ToolHold.Span),
                ),
                NodeWrite(
                    key = "finish-serve",
                    title = "Finish and serve",
                    body = "Stir in the sliced red bell pepper and cook briefly. Tear in fresh Thai basil and " +
                        "kaffir lime leaves, then serve hot over steamed jasmine rice.",
                    ord = 3,
                    spans = listOf(SpanWrite(0, SpanKind.Active, 120)),
                    ingredients = listOf(
                        NodeIngredientWrite(redBellPepper, 1.0, "pc"),
                        NodeIngredientWrite(thaiBasil, 1.0, "handful"),
                        NodeIngredientWrite(kaffirLimeLeaves, 4.0, "leaf"),
                        NodeIngredientWrite(jasmineRice, 300.0, "g"),
                    ),
                    tools = wokUse(),
                ),
            ),
            edges = listOf(
                EdgeWrite("saute-paste", "simmer-sauce"),
                EdgeWrite("simmer-sauce", "cook-protein-veg"),
                EdgeWrite("cook-protein-veg", "finish-serve"),
            ),
        )
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

private val PNG: ByteArray = (
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de" +
        "0000000c4944415408d763f8cfc00000000300010005fe02fe0000000049454e44ae426082"
).hexToByteArray()

