plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.kotlinSerialization) apply false
    alias(libs.plugins.sqldelight) apply false
}

tasks.register("test") {
    group = "verification"
    description = "Run native tests in all modules"
    dependsOn(":packages:core:nativeTest", ":apps:api:nativeTest")
}
