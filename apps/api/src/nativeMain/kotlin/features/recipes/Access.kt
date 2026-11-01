package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.recipes.domain.RecipePermission
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeVisibility
import io.ktor.http.HttpStatusCode

data class RecipeAcl(
    val ownerId: Long?,
    val visibility: RecipeVisibility,
    val grant: RecipePermission?,
)

enum class RecipeAction {
    Read,
    Update,
    Delete,
    Grant,
    ChangeVisibility,
}

fun canRead(actorId: Long?, acl: RecipeAcl): Boolean =
    acl.visibility == RecipeVisibility.Public ||
        (actorId != null && (actorId == acl.ownerId || acl.grant != null))

fun decide(actorId: Long?, acl: RecipeAcl, action: RecipeAction): HttpStatusCode? {
    if (action == RecipeAction.Read) {
        return if (canRead(actorId, acl)) null else HttpStatusCode.NotFound
    }
    if (actorId == null) return HttpStatusCode.Unauthorized
    val allowed = when (action) {
        RecipeAction.Read -> canRead(actorId, acl)
        RecipeAction.Update -> acl.ownerId == null || actorId == acl.ownerId || acl.grant == RecipePermission.Write
        RecipeAction.Delete -> acl.ownerId == null || actorId == acl.ownerId
        RecipeAction.Grant -> acl.ownerId != null && actorId == acl.ownerId
        RecipeAction.ChangeVisibility -> acl.ownerId == null || actorId == acl.ownerId
    }
    if (allowed) return null
    return if (canRead(actorId, acl)) HttpStatusCode.Forbidden else HttpStatusCode.NotFound
}
