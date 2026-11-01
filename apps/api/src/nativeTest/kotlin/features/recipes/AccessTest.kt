package com.bieniucieniu.cookbook.features.recipes

import com.bieniucieniu.cookbook.features.recipes.domain.RecipePermission
import com.bieniucieniu.cookbook.features.recipes.domain.RecipeVisibility
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AccessTest {
    private val owner = 1L
    private val other = 2L

    @Test
    fun anonymousPublicReadIsAllowed() {
        assertNull(decide(null, acl(RecipeVisibility.Public, null), RecipeAction.Read))
    }

    @Test
    fun anonymousPrivateReadIsNotFound() {
        assertEquals(HttpStatusCode.NotFound, decide(null, acl(RecipeVisibility.Private, null, owner), RecipeAction.Read))
    }

    @Test
    fun anonymousWriteIsUnauthorized() {
        assertEquals(HttpStatusCode.Unauthorized, decide(null, acl(RecipeVisibility.Public, null), RecipeAction.Update))
        assertEquals(HttpStatusCode.Unauthorized, decide(null, acl(RecipeVisibility.Public, null), RecipeAction.Delete))
    }

    @Test
    fun ownerCanDoEverything() {
        val owned = acl(RecipeVisibility.Private, null, owner)
        assertNull(decide(owner, owned, RecipeAction.Read))
        assertNull(decide(owner, owned, RecipeAction.Update))
        assertNull(decide(owner, owned, RecipeAction.Delete))
        assertNull(decide(owner, owned, RecipeAction.Grant))
        assertNull(decide(owner, owned, RecipeAction.ChangeVisibility))
    }

    @Test
    fun readGrantCannotUpdateOrDelete() {
        val granted = acl(RecipeVisibility.Private, RecipePermission.Read, owner)
        assertNull(decide(other, granted, RecipeAction.Read))
        assertEquals(HttpStatusCode.Forbidden, decide(other, granted, RecipeAction.Update))
        assertEquals(HttpStatusCode.Forbidden, decide(other, granted, RecipeAction.Delete))
        assertEquals(HttpStatusCode.Forbidden, decide(other, granted, RecipeAction.Grant))
    }

    @Test
    fun writeGrantCannotDeleteOrGrant() {
        val granted = acl(RecipeVisibility.Private, RecipePermission.Write, owner)
        assertNull(decide(other, granted, RecipeAction.Read))
        assertNull(decide(other, granted, RecipeAction.Update))
        assertEquals(HttpStatusCode.Forbidden, decide(other, granted, RecipeAction.Delete))
        assertEquals(HttpStatusCode.Forbidden, decide(other, granted, RecipeAction.Grant))
        assertEquals(HttpStatusCode.Forbidden, decide(other, granted, RecipeAction.ChangeVisibility))
    }

    @Test
    fun unownedRecipeAllowsAuthenticatedEditButNotGrant() {
        val unowned = acl(RecipeVisibility.Public, null, null)
        assertNull(decide(other, unowned, RecipeAction.Update))
        assertNull(decide(other, unowned, RecipeAction.Delete))
        assertNull(decide(other, unowned, RecipeAction.ChangeVisibility))
        assertEquals(HttpStatusCode.Forbidden, decide(other, unowned, RecipeAction.Grant))
    }

    @Test
    fun hiddenRecipeStaysNotFound() {
        val hidden = acl(RecipeVisibility.Private, null, owner)
        assertEquals(HttpStatusCode.NotFound, decide(other, hidden, RecipeAction.Read))
        assertEquals(HttpStatusCode.NotFound, decide(other, hidden, RecipeAction.Update))
        assertEquals(HttpStatusCode.NotFound, decide(other, hidden, RecipeAction.Grant))
    }

    private fun acl(visibility: RecipeVisibility, grant: RecipePermission?, ownerId: Long? = owner) =
        RecipeAcl(ownerId, visibility, grant)
}
