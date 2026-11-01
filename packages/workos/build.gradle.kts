plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

kotlin {
    val hostOs = System.getProperty("os.name")
    val arch = System.getProperty("os.arch")
    when {
        hostOs == "Mac OS X" && arch == "x86_64" -> macosX64("native")
        hostOs == "Mac OS X" && arch == "aarch64" -> macosArm64("native")
        hostOs == "Linux" && (arch == "x86_64" || arch == "amd64") -> linuxX64("native")
        hostOs == "Linux" && arch == "aarch64" -> linuxArm64("native")
        hostOs.startsWith("Windows") -> mingwX64("native")
        else -> throw GradleException("Host OS is not supported in Kotlin/Native.")
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(libs.ktor.clientCore)
                implementation(libs.ktor.clientContentNegotiation)
                implementation(libs.ktor.serializationKotlinxJson)
                implementation(libs.kotlincrypto.sha2)
            }
        }
        val nativeMain by getting {
            dependsOn(commonMain)
        }
        val commonTest by getting
        val nativeTest by getting {
            dependsOn(commonTest)
            dependencies {
                implementation(libs.kotlin.test)
                implementation(libs.ktor.clientMock)
            }
        }
    }
}
