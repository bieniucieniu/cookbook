package com.bieniucieniu.cookbook.app

/**
 * Every HTTP endpoint lives under a version prefix. A breaking change ships as a new prefix
 * (for example `/api/v2`) mounted beside this one in [configureRouting], so v1 clients keep working.
 * Only `/.well-known/` stays at the root, where OAuth discovery looks for it.
 */
object ApiVersion {
    const val V1 = "/api/v1"
}
