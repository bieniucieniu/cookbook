plugins {
    alias(libs.plugins.kotlinMultiplatform)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

kotlin {
    val hostOs = System.getProperty("os.name")
    val arch = System.getProperty("os.arch")
    when {
        hostOs == "Mac OS X" && arch == "x86_64" -> macosX64()
        hostOs == "Mac OS X" && arch == "aarch64" -> macosArm64()
        hostOs == "Linux" && (arch == "x86_64" || arch == "amd64") -> linuxX64()
        hostOs == "Linux" && arch == "aarch64" -> linuxArm64()
        hostOs.startsWith("Windows") -> mingwX64()
        else -> error("Host OS is not supported: $hostOs $arch")
    }

    sourceSets {
        commonTest.dependencies {
            implementation(libs.kotlin.test)
        }
    }
}
