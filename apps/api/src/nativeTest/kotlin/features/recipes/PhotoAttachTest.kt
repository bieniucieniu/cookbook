package com.bieniucieniu.cookbook.features.recipes

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PhotoAttachTest {
    private val actor = 9L
    private val other = 2L
    private val recipe = 4L

    @Test
    fun keepsPhotoAlreadyOnThisRecipe() {
        assertFalse(photoAttachForbidden(other, actor, recipe, recipe))
        assertFalse(photoAttachForbidden(actor, actor, recipe, recipe))
    }

    @Test
    fun unattachedPhotoMustBelongToActor() {
        assertFalse(photoAttachForbidden(actor, actor, null, recipe))
        assertTrue(photoAttachForbidden(other, actor, null, recipe))
    }

    @Test
    fun photoOnAnotherRecipeStaysForbidden() {
        assertTrue(photoAttachForbidden(actor, actor, 3L, recipe))
        assertTrue(photoAttachForbidden(other, actor, 3L, recipe))
    }
}
