package com.anttcontrol

import com.anttcontrol.modules.regulatorycases.RegulatoryCaseService
import kotlin.test.Test
import kotlin.test.assertEquals

class TenantIsolationTest {
    @Test
    fun `lists only requested organization cases`() {
        val service = RegulatoryCaseService()
        assertEquals(2, service.list("org-demo").size)
        assertEquals(0, service.list("other-org").size)
    }
}
