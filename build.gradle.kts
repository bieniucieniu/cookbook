plugins {
    alias(libs.plugins.kotlinJvm) apply false
    alias(libs.plugins.kotlinSerialization) apply false
    alias(libs.plugins.ktor) apply false
}

tasks.register("test") {
    group = "verification"
    description = "Run JVM tests in all modules"
    dependsOn(":packages:core:test", ":apps:server:test")
}
