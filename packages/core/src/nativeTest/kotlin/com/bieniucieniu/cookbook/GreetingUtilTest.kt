package com.bieniucieniu.cookbook

import kotlin.test.Test
import kotlin.test.assertEquals

class GreetingUtilTest {

    @Test
    fun sayHello() {
        assertEquals("Hello, Ktor!", sayHello("Ktor"))
    }
}
