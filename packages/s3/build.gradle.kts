plugins {
    alias(libs.plugins.kotlinMultiplatform)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

kotlin {
    val hostOs = System.getProperty("os.name")
    val arch = System.getProperty("os.arch")
    val requestedTarget = project.findProperty("native.target") as String?
    when (requestedTarget) {
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

    sourceSets {
        val commonMain = getByName("commonMain") {
            dependencies {
                implementation(libs.ktor.clientCore)
                implementation(libs.kotlincrypto.sha2)
            }
        }
        val nativeMain = getByName("nativeMain") {
            dependsOn(commonMain)
        }
        val commonTest = getByName("commonTest")
        val nativeTest = getByName("nativeTest") {
            dependsOn(commonTest)
            dependencies {
                implementation(libs.kotlin.test)
                implementation(libs.ktor.clientMock)
            }
        }
    }
}
