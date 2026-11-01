package com.bieniucieniu.cookbook.features.photos

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class PhotoRulesTest {
    @Test
    fun acceptsJpegPngAndWebpUnderTheLimit() {
        assertNull(photoRejection(4, "image/jpeg", 8))
        assertNull(photoRejection(4, "image/png; charset=binary", 8))
        assertNull(photoRejection(4, "IMAGE/WEBP", 8))
    }

    @Test
    fun rejectsOversizeBeforeStorage() {
        assertEquals(
            "photo is larger than 8 bytes",
            photoRejection(9, "image/png", 8),
        )
    }

    @Test
    fun rejectsOtherTypes() {
        assertEquals(
            "photo must be jpeg, png, or webp",
            photoRejection(4, "image/gif", 8),
        )
    }
}
