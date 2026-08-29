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
        mapOf("title" to "Resolucao ANTT sobre CIOT", "status" to "NOT_VERIFIED", "source" to "Fonte oficial pendente"),
        mapOf("title" to "Lei do Piso Minimo", "status" to "NOT_VERIFIED", "source" to "Fonte oficial pendente")
    )

    fun radar() = listOf(
        mapOf("title" to "Tema CIOT com possivel impacto", "impactLevel" to "HIGH", "note" to "Analise de apoio, sem conclusao juridica")
    )

    fun notifications(organizationId: String) = deadlines(organizationId, "case-001")
        .map { mapOf("type" to "DEADLINE_APPROACHING", "title" to it.deadlineType, "dueDate" to it.dueDate) }

    fun audit(organizationId: String) = list(organizationId)
        .flatMap { case -> case.timeline.map { mapOf("caseId" to case.id, "action" to it.action, "createdAt" to it.createdAt, "user" to it.user) } }

    fun dashboard(organizationId: String): Map<String, Any> {
        val scoped = list(organizationId)
        return mapOf(
            "organizationId" to organizationId,
            "activeCases" to scoped.count { it.status != CaseStatus.CLOSED },
            "criticalCases" to scoped.count { it.riskLevel == RiskLevel.CRITICAL },
            "financialExposure" to scoped.filter { it.status != CaseStatus.CLOSED }.sumOf { it.amount },
            "regulatoryScore" to 72
        )
    }
}
