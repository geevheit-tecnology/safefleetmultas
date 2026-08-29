package com.anttcontrol.modules.regulatorycases

import kotlinx.serialization.Serializable

@Serializable
enum class CaseStatus {
    RECEIVED, TRIAGE, ANALYSIS, ACTION_REQUIRED, IN_TREATMENT, WAITING_DOCUMENTS,
    WAITING_EXTERNAL, DECISION, APPEAL, FINALIZATION, CLOSED
}

@Serializable
enum class RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

@Serializable
data class RegulatoryCase(
    val id: String,
    val organizationId: String,
    val caseNumber: String,
    val category: String,
    val subcategory: String,
    val amount: Double,
    val status: CaseStatus,
    val riskScore: Int,
    val riskLevel: RiskLevel,
    val deadlines: List<CaseDeadline>,
    val actions: List<CaseAction>,
    val documents: List<CaseDocument>,
    val timeline: List<CaseEvent>
)

@Serializable
data class CaseEvent(
    val id: String,
    val action: String,
    val description: String,
    val user: String,
    val createdAt: String
)

@Serializable
data class CaseDeadline(
    val id: String,
    val deadlineType: String,
    val dueDate: String,
    val status: String,
    val legalBasis: String
)

@Serializable
data class CaseAction(
    val id: String,
    val title: String,
    val priority: String,
    val status: String,
    val dueDate: String
)

@Serializable
data class CaseDocument(
    val id: String,
    val name: String,
    val documentType: String,
    val storageKey: String,
    val version: Int
)
