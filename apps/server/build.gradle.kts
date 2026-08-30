plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.ksp)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

val hostOs = System.getProperty("os.name")
val hostArch = System.getProperty("os.arch")
val hostTargetName = when {
    hostOs == "Mac OS X" && hostArch == "x86_64" -> "macosX64"
    hostOs == "Mac OS X" && hostArch == "aarch64" -> "macosArm64"
    hostOs == "Linux" && (hostArch == "x86_64" || hostArch == "amd64") -> "linuxX64"
    hostOs == "Linux" && hostArch == "aarch64" -> "linuxArm64"
    hostOs.startsWith("Windows") -> "mingwX64"
    else -> error("Host OS is not supported: $hostOs $hostArch")
}
val hostTargetSuffix = hostTargetName.replaceFirstChar { it.uppercaseChar() }

kotlin {
    val nativeTarget = when (hostTargetName) {
        "macosX64" -> macosX64()
        "macosArm64" -> macosArm64()
        "linuxX64" -> linuxX64()
        "linuxArm64" -> linuxArm64()
        "mingwX64" -> mingwX64()
        else -> error("Host OS is not supported: $hostOs $hostArch")
    }
    nativeTarget.binaries {
        executable {
            entryPoint = "com.bieniucieniu.cookbook.main"
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(project(":packages:core"))
            implementation(libs.ktor.serverCore)
            implementation(libs.ktor.serverCio)
            implementation(libs.ktor.serverContentNegotiation)
            implementation(libs.ktor.serializationKotlinxJson)
            implementation(libs.sqlx4k.postgres)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.ktor.serverTestHost)
        }
        // KSP emits into ${target}Main. Put Main + /recipes there so generated
        // RecipeRepositoryImpl is visible without also listing those files in commonMain.
        named("${nativeTarget.name}Main") {
            kotlin.srcDir("src/nativeHostMain/kotlin")
        }
    }
}

tasks.register("run") {
    group = "application"
    description = "Run host Native debug executable"
    dependsOn("runDebugExecutable$hostTargetSuffix")
}

ksp {
    arg("dialect", "postgresql")
    arg("output-package", "com.bieniucieniu.cookbook")
}

dependencies {
    add("ksp$hostTargetSuffix", libs.sqlx4k.codegen)
}
