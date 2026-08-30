rootProject.name = "cookbook"

pluginManagement {
    repositories {
        google {
            mavenContent {
                includeGroupAndSubgroups("com.google")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google {
            mavenContent {
                includeGroupAndSubgroups("com.google")
            }
        }
        mavenCentral()
    }
}

include(":apps:server")
include(":packages:core")
