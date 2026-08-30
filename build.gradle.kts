plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.kotlinSerialization) apply false
    alias(libs.plugins.ksp) apply false
}

tasks.register("test") {
    group = "verification"
    description = "Run host Native tests in all modules"
    dependsOn(":packages:core:allTests", ":apps:server:allTests")
}
