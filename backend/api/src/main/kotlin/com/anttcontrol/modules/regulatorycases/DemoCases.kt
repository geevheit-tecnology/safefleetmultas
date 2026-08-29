package com.anttcontrol.modules.regulatorycases

object DemoCases {
    val items = listOf(
        RegulatoryCase(
            id = "case-001",
            organizationId = "org-demo",
            caseNumber = "AC-2026-001",
            category = "CIOT",
            subcategory = "Ausencia de CIOT",
            amount = 5500.0,
            status = CaseStatus.ACTION_REQUIRED,
            riskScore = 82,
            riskLevel = RiskLevel.CRITICAL,
            deadlines = listOf(CaseDeadline("dl-1", "Validar prazo de defesa", "2026-09-03", "PENDING", "NOT_VERIFIED")),
            actions = listOf(
                CaseAction("ac-1", "Conferir dados do auto", "HIGH", "DONE", "2026-08-20"),
                CaseAction("ac-2", "Validar enquadramento legal", "HIGH", "IN_PROGRESS", "2026-08-29")
            ),
            documents = listOf(CaseDocument("doc-1", "auto-infracao-demo.pdf", "AUTO_INFRINGEMENT", "demo/org-demo/case-001/auto.pdf", 1)),
            timeline = listOf(
                CaseEvent("ev-1", "CASE_CREATED", "Prontuario criado com dados demo.", "Maria Souza", "2026-08-14T09:15:00Z"),
                CaseEvent("ev-2", "RISK_CHANGED", "Score 82/100 gerado como analise de apoio.", "RiskEngine", "2026-08-15T09:10:00Z")
            )
        ),
        RegulatoryCase(
            id = "case-002",
            organizationId = "org-demo",
            caseNumber = "AC-2026-002",
            category = "Piso Minimo",
            subcategory = "Valor abaixo do piso",
            amount = 10500.0,
            status = CaseStatus.IN_TREATMENT,
            riskScore = 65,
            riskLevel = RiskLevel.HIGH,
            deadlines = listOf(CaseDeadline("dl-2", "Recurso administrativo", "2026-09-07", "PENDING", "NOT_VERIFIED")),
            actions = listOf(CaseAction("ac-3", "Anexar comprovantes da operacao", "MEDIUM", "PENDING", "2026-08-30")),
            documents = emptyList(),
            timeline = listOf(CaseEvent("ev-3", "CASE_CREATED", "Caso aberto para analise operacional.", "Carlos Oliveira", "2026-07-30T14:00:00Z"))
        )
    )
}
