package com.anttcontrol.modules.regulatorycases

class RegulatoryCaseService {
    private val database = com.anttcontrol.platform.database.Database.fromEnv()
    private val repository: RegulatoryCaseRepository =
        if (database.enabled) PostgresRegulatoryCaseRepository(database) else DemoRegulatoryCaseRepository()

    fun list(organizationId: String) = repository.list(organizationId)

    fun find(organizationId: String, id: String) =
        repository.find(organizationId, id)
            ?: error("Case not found")

    fun timeline(organizationId: String, id: String) = find(organizationId, id).timeline

    fun documents(organizationId: String, id: String) = find(organizationId, id).documents

    fun deadlines(organizationId: String, id: String) = find(organizationId, id).deadlines

    fun actions(organizationId: String, id: String) = find(organizationId, id).actions

    fun legislation() = listOf(
        LegislationMock("Resolucao ANTT sobre CIOT", "NOT_VERIFIED", "Fonte oficial pendente"),
        LegislationMock("Lei do Piso Minimo", "NOT_VERIFIED", "Fonte oficial pendente")
    )

    fun radar() = listOf(
        RadarMock("Tema CIOT com possivel impacto", "HIGH", "Analise de apoio, sem conclusao juridica")
    )

    fun notifications(organizationId: String) = deadlines(organizationId, "case-001")
        .map { NotificationMock("DEADLINE_APPROACHING", it.deadlineType, it.dueDate) }

    fun audit(organizationId: String) = list(organizationId)
        .flatMap { case -> case.timeline.map { AuditMock(case.id, it.action, it.createdAt, it.user) } }

    fun dashboard(organizationId: String): DashboardSummary {
        val scoped = list(organizationId)
        return DashboardSummary(
            organizationId = organizationId,
            activeCases = scoped.count { it.status != CaseStatus.CLOSED },
            criticalCases = scoped.count { it.riskLevel == RiskLevel.CRITICAL },
            financialExposure = scoped.filter { it.status != CaseStatus.CLOSED }.sumOf { it.amount },
            regulatoryScore = 72
        )
    }
}

@kotlinx.serialization.Serializable
data class LegislationMock(val title: String, val status: String, val source: String)

@kotlinx.serialization.Serializable
data class RadarMock(val title: String, val impactLevel: String, val note: String)

@kotlinx.serialization.Serializable
data class NotificationMock(val type: String, val title: String, val dueDate: String)

@kotlinx.serialization.Serializable
data class AuditMock(val caseId: String, val action: String, val createdAt: String, val user: String)

@kotlinx.serialization.Serializable
data class DashboardSummary(
    val organizationId: String,
    val activeCases: Int,
    val criticalCases: Int,
    val financialExposure: Double,
    val regulatoryScore: Int
)
