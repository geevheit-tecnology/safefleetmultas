package com.anttcontrol

import com.anttcontrol.modules.workflow.CaseStatus
import com.anttcontrol.modules.workflow.CaseWorkflow
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class WorkflowTest {
    @Test
    fun `received can only move to triage`() {
        val workflow = CaseWorkflow()
        assertTrue(workflow.canTransition(CaseStatus.RECEIVED, CaseStatus.TRIAGE))
        assertFalse(workflow.canTransition(CaseStatus.RECEIVED, CaseStatus.CLOSED))
    }
}
