plugins {
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.ktor)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"
application {
    mainClass = "com.bieniucieniu.cookbook.ApplicationKt"
}

dependencies {
    api(project(":packages:core"))
    implementation(libs.logback)
    implementation(libs.ktor.serverCore)
    implementation(libs.ktor.serverNetty)
    testImplementation(libs.ktor.serverTestHost)
    testImplementation(libs.kotlin.testJunit)
}
