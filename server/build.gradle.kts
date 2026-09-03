plugins {
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.ktor)
}

group = "com.bieniucieniu.cookbook"
version = "1.0.0"

application {
    mainClass.set("io.ktor.server.cio.EngineMain")
}

dependencies {
    implementation(project(":packages:core"))
    implementation(libs.ktor.serverCore)
    implementation(libs.ktor.serverCio)
    implementation(libs.ktor.serverConfigYaml)
    implementation(libs.ktor.serverContentNegotiation)
    implementation(libs.ktor.serializationKotlinxJson)
    implementation(libs.workos)
    implementation(libs.hikari)
    implementation(libs.postgresql)
    implementation(libs.logback)
    implementation(libs.koin.core)
    implementation(libs.koin.ktor)
    implementation(libs.koin.slf4j)
    testImplementation(libs.kotlin.testJunit)
    testImplementation(libs.ktor.serverTestHost)
}
