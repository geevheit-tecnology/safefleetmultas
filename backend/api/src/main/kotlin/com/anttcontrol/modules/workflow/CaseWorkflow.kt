package com.anttcontrol.modules.workflow

enum class CaseStatus {
    RECEIVED, TRIAGE, ANALYSIS, ACTION_REQUIRED, IN_TREATMENT, WAITING_DOCUMENTS,
    WAITING_EXTERNAL, DECISION, APPEAL, FINALIZATION, CLOSED
}

class CaseWorkflow {
    private val transitions = mapOf(
        CaseStatus.RECEIVED to setOf(CaseStatus.TRIAGE),
        CaseStatus.TRIAGE to setOf(CaseStatus.ANALYSIS, CaseStatus.WAITING_DOCUMENTS),
        CaseStatus.ANALYSIS to setOf(CaseStatus.ACTION_REQUIRED, CaseStatus.WAITING_EXTERNAL, CaseStatus.DECISION),
        CaseStatus.ACTION_REQUIRED to setOf(CaseStatus.IN_TREATMENT, CaseStatus.WAITING_DOCUMENTS),
        CaseStatus.IN_TREATMENT to setOf(CaseStatus.WAITING_EXTERNAL, CaseStatus.DECISION, CaseStatus.APPEAL),
        CaseStatus.WAITING_DOCUMENTS to setOf(CaseStatus.ANALYSIS, CaseStatus.ACTION_REQUIRED),
        CaseStatus.WAITING_EXTERNAL to setOf(CaseStatus.DECISION, CaseStatus.APPEAL),
        CaseStatus.DECISION to setOf(CaseStatus.APPEAL, CaseStatus.FINALIZATION),
        CaseStatus.APPEAL to setOf(CaseStatus.DECISION, CaseStatus.FINALIZATION),
        CaseStatus.FINALIZATION to setOf(CaseStatus.CLOSED),
        CaseStatus.CLOSED to emptySet()
    )

    fun canTransition(from: CaseStatus, to: CaseStatus): Boolean = transitions[from]?.contains(to) == true
}
