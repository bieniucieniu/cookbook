plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.sqldelight)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

kotlin {
    val hostOs = System.getProperty("os.name")
    val arch = System.getProperty("os.arch")
    val nativeTarget = when {
        hostOs == "Mac OS X" && arch == "x86_64" -> macosX64("native")
        hostOs == "Mac OS X" && arch == "aarch64" -> macosArm64("native")
        hostOs == "Linux" && (arch == "x86_64" || arch == "amd64") -> linuxX64("native")
        hostOs == "Linux" && arch == "aarch64" -> linuxArm64("native")
        hostOs.startsWith("Windows") -> mingwX64("native")
        else -> throw GradleException("Host OS is not supported in Kotlin/Native.")
    }

    nativeTarget.apply {
        binaries {
            executable {
                entryPoint = "com.bieniucieniu.cookbook.main"
            }
        }
    }

    sourceSets {
        val commonMain by getting
        val nativeMain by getting {
            dependsOn(commonMain)
        }
        val commonTest by getting
        val nativeTest by getting {
            dependsOn(commonTest)
        }
        nativeMain.dependencies {
            implementation(project(":packages:core"))
            implementation(libs.ktor.serverCore)
            implementation(libs.ktor.serverCio)
            implementation(libs.ktor.serverContentNegotiation)
            implementation(libs.ktor.serverRoutingOpenApi)
            implementation(libs.ktor.serializationKotlinxJson)
            implementation(libs.koin.core)
            implementation(libs.koin.ktor)
            implementation(libs.sqlx4k.postgres)
            implementation(libs.sqlx4k.sqldelight)
        }
        nativeTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.ktor.serverTestHost)
        }
    }
}

sqldelight {
    linkSqlite = false
    databases.register("CookbookDatabase") {
        generateAsync = true
        packageName = "com.bieniucieniu.cookbook.db"
        dialect(libs.sqlx4k.sqldelight.dialect.postgres)
    }
}
