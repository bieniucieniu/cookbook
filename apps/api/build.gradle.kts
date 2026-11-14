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
    val requestedTarget = project.findProperty("native.target") as String?
    val nativeTarget = when (requestedTarget) {
        "linuxX64" -> linuxX64("native")
        "linuxArm64" -> linuxArm64("native")
        null -> when {
            hostOs == "Mac OS X" && arch == "x86_64" ->
                throw GradleException("Intel macOS (macosX64) is deprecated in Kotlin/Native. Build on Apple Silicon or Linux.")
            hostOs == "Mac OS X" && arch == "aarch64" -> macosArm64("native")
            hostOs == "Linux" && (arch == "x86_64" || arch == "amd64") -> linuxX64("native")
            hostOs == "Linux" && arch == "aarch64" -> linuxArm64("native")
            hostOs.startsWith("Windows") -> mingwX64("native")
            else -> throw GradleException("Host OS is not supported in Kotlin/Native.")
        }
        else -> throw GradleException("Unsupported -Pnative.target=$requestedTarget. Use linuxX64 or linuxArm64.")
    }

    nativeTarget.apply {
        binaries {
            executable {
                entryPoint = "com.bieniucieniu.cookbook.main"
                // The custom allocator maps a 2GiB arena and faults it during
                // startup. On the Pi that exceeds the container limit.
                compilerOptions.freeCompilerArgs.add("-Xallocator=std")
                val curlArch = when (requestedTarget) {
                    "linuxArm64" -> "aarch64"
                    "linuxX64" -> "x86_64"
                    null -> if (hostOs == "Linux") {
                        if (arch == "aarch64") "aarch64" else "x86_64"
                    } else {
                        null
                    }
                    else -> null
                }
                if (curlArch != null) {
                    linkerOpts("-L/usr/lib/$curlArch-linux-gnu", "-L/usr/lib", "-lcurl")
                }
            }
        }
    }

    sourceSets {
        val commonMain = getByName("commonMain")
        val nativeMain = getByName("nativeMain") {
            dependsOn(commonMain)
        }
        val commonTest = getByName("commonTest")
        val nativeTest = getByName("nativeTest") {
            dependsOn(commonTest)
        }
        nativeMain.dependencies {
            implementation(project(":packages:core"))
            implementation(project(":packages:workos"))
            implementation(project(":packages:s3"))
            implementation(libs.ktor.clientCurl)
            implementation(libs.ktor.clientContentNegotiation)
            implementation(libs.ktor.serverCore)
            implementation(libs.ktor.serverStatusPages)
            implementation(libs.ktor.serverCio)
            implementation(libs.ktor.serverContentNegotiation)
            implementation(libs.ktor.serverRoutingOpenApi)
            implementation(libs.ktor.serializationKotlinxJson)
            implementation(libs.koin.core)
            implementation(libs.koin.ktor)
            implementation(libs.sqlx4k.postgres)
            implementation(libs.sqlx4k.sqldelight)
            implementation(libs.cryptography.core)
            implementation(libs.cryptography.random)
            implementation(libs.cryptography.bigint)
            implementation(libs.cryptography.serialization.asn1)
            implementation(libs.cryptography.serialization.asn1.modules)
            implementation(libs.cryptography.provider.openssl3.prebuilt)
        }
        nativeTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.ktor.serverTestHost)
            implementation(libs.ktor.clientMock)
            implementation(libs.ktor.clientContentNegotiation)
        }
    }
}

tasks.register<Exec>("seed") {
    group = "application"
    description = "Load the Eggs on toast sample"
    val debugExecutable = (kotlin.targets.getByName("native") as org.jetbrains.kotlin.gradle.plugin.mpp.KotlinNativeTarget)
        .binaries
        .getExecutable(org.jetbrains.kotlin.gradle.plugin.mpp.NativeBuildType.DEBUG)
    dependsOn(debugExecutable.linkTaskProvider)
    executable(debugExecutable.outputFile.absolutePath)
    args("seed")
    workingDir(rootProject.projectDir)
}

sqldelight {
    linkSqlite = false
    databases.register("CookbookDatabase") {
        generateAsync = true
        packageName = "com.bieniucieniu.cookbook.db"
        dialect(libs.sqlx4k.sqldelight.dialect.postgres)
    }
}
