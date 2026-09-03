plugins {
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.ktor)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

application {
    mainClass.set("com.bieniucieniu.cookbook.MainKt")
}

dependencies {
    implementation(project(":packages:core"))
    implementation(libs.ktor.serverCore)
    implementation(libs.ktor.serverCio)
    implementation(libs.ktor.serverContentNegotiation)
    implementation(libs.ktor.serializationKotlinxJson)
    implementation(libs.workos)
    implementation(libs.hikari)
    implementation(libs.postgresql)
    implementation(libs.logback)
    testImplementation(libs.kotlin.testJunit)
    testImplementation(libs.ktor.serverTestHost)
}
