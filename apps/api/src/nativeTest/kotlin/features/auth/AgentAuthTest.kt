package com.bieniucieniu.cookbook.features.auth

import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AgentAuthTest {
    @Test
    fun bearerMatchesTheConfiguredToken() {
        assertTrue(bearerMatches("Bearer secret-token", "secret-token"))
    }

    @Test
    fun wrongOrMissingTokenDoesNotMatch() {
        assertFalse(bearerMatches("Bearer other-token", "secret-token"))
        assertFalse(bearerMatches("Bearer secret-token", null))
        assertFalse(bearerMatches("Bearer secret-token", ""))
        assertFalse(bearerMatches("secret-token", "secret-token"))
        assertFalse(bearerMatches("Bearer short", "secret-token"))
    }
}
