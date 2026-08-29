package com.anttcontrol

import com.anttcontrol.modules.risk.RiskEngine
import com.anttcontrol.modules.risk.RiskLevel
import kotlin.test.Test
import kotlin.test.assertEquals

class RiskEngineTest {
    @Test
    fun `classifies risk from configurable thresholds`() {
        val engine = RiskEngine()
        assertEquals(RiskLevel.LOW, engine.classify(24))
        assertEquals(RiskLevel.MEDIUM, engine.classify(49))
        assertEquals(RiskLevel.HIGH, engine.classify(74))
        assertEquals(RiskLevel.CRITICAL, engine.classify(75))
    }
}
