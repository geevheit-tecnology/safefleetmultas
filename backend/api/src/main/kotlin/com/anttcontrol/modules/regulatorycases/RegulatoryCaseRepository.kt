package com.anttcontrol.modules.regulatorycases

import com.anttcontrol.platform.database.Database

interface RegulatoryCaseRepository {
    fun list(organizationId: String): List<RegulatoryCase>
    fun find(organizationId: String, id: String): RegulatoryCase?
}

class DemoRegulatoryCaseRepository : RegulatoryCaseRepository {
    override fun list(organizationId: String): List<RegulatoryCase> =
        DemoCases.items.filter { it.organizationId == organizationId }

    override fun find(organizationId: String, id: String): RegulatoryCase? =
        list(organizationId).firstOrNull { it.id == id }
}

class PostgresRegulatoryCaseRepository(private val database: Database) : RegulatoryCaseRepository {
    override fun list(organizationId: String): List<RegulatoryCase> = database.query { connection ->
        connection.prepareStatement(
            """
            select id, organization_id, case_number, category, coalesce(subcategory, '') as subcategory,
                   coalesce(amount, 0) as amount, status, risk_score, risk_level
            from regulatory_cases
            where organization_id = ?::uuid
            order by created_at desc
            """.trimIndent()
        ).use { statement ->
            statement.setString(1, organizationId)
            statement.executeQuery().use { rs ->
                val output = mutableListOf<RegulatoryCase>()
                while (rs.next()) {
                    val caseId = rs.getString("id")
                    output.add(
                        RegulatoryCase(
                            id = caseId,
                            organizationId = rs.getString("organization_id"),
                            caseNumber = rs.getString("case_number"),
                            category = rs.getString("category"),
                            subcategory = rs.getString("subcategory"),
                            amount = rs.getDouble("amount"),
                            status = CaseStatus.valueOf(rs.getString("status")),
                            riskScore = rs.getInt("risk_score"),
                            riskLevel = RiskLevel.valueOf(rs.getString("risk_level")),
                            deadlines = deadlines(organizationId, caseId),
                            actions = actions(organizationId, caseId),
                            documents = documents(organizationId, caseId),
                            timeline = timeline(organizationId, caseId)
                        )
                    )
                }
                output
            }
        }
    }

    override fun find(organizationId: String, id: String): RegulatoryCase? =
        list(organizationId).firstOrNull { it.id == id }

    private fun timeline(organizationId: String, caseId: String): List<CaseEvent> = database.query { connection ->
        connection.prepareStatement(
            """
            select id, action, coalesce(description, '') as description, coalesce(user_id::text, 'Sistema') as user_name, created_at::text
            from case_events
            where organization_id = ?::uuid and case_id = ?::uuid
            order by created_at asc
            """.trimIndent()
        ).use { statement ->
            statement.setString(1, organizationId)
            statement.setString(2, caseId)
            statement.executeQuery().use { rs ->
                val output = mutableListOf<CaseEvent>()
                while (rs.next()) {
                    output.add(CaseEvent(rs.getString("id"), rs.getString("action"), rs.getString("description"), rs.getString("user_name"), rs.getString("created_at")))
                }
                output
            }
        }
    }

    private fun deadlines(organizationId: String, caseId: String): List<CaseDeadline> = database.query { connection ->
        connection.prepareStatement(
            """
            select id, deadline_type, due_date::text, status, legal_basis
            from case_deadlines
            where organization_id = ?::uuid and case_id = ?::uuid
            order by due_date asc
            """.trimIndent()
        ).use { statement ->
            statement.setString(1, organizationId)
            statement.setString(2, caseId)
            statement.executeQuery().use { rs ->
                val output = mutableListOf<CaseDeadline>()
                while (rs.next()) {
                    output.add(CaseDeadline(rs.getString("id"), rs.getString("deadline_type"), rs.getString("due_date"), rs.getString("status"), rs.getString("legal_basis")))
                }
                output
            }
        }
    }

    private fun actions(organizationId: String, caseId: String): List<CaseAction> = database.query { connection ->
        connection.prepareStatement(
            """
            select id, title, priority, status, coalesce(due_date::text, '') as due_date
            from case_actions
            where organization_id = ?::uuid and case_id = ?::uuid
            order by due_date asc nulls last
            """.trimIndent()
        ).use { statement ->
            statement.setString(1, organizationId)
            statement.setString(2, caseId)
            statement.executeQuery().use { rs ->
                val output = mutableListOf<CaseAction>()
                while (rs.next()) {
                    output.add(CaseAction(rs.getString("id"), rs.getString("title"), rs.getString("priority"), rs.getString("status"), rs.getString("due_date")))
                }
                output
            }
        }
    }

    private fun documents(organizationId: String, caseId: String): List<CaseDocument> = database.query { connection ->
        connection.prepareStatement(
            """
            select id, name, document_type, storage_key, 1 as version
            from case_documents
            where organization_id = ?::uuid and case_id = ?::uuid
            order by created_at desc
            """.trimIndent()
        ).use { statement ->
            statement.setString(1, organizationId)
            statement.setString(2, caseId)
            statement.executeQuery().use { rs ->
                val output = mutableListOf<CaseDocument>()
                while (rs.next()) {
                    output.add(CaseDocument(rs.getString("id"), rs.getString("name"), rs.getString("document_type"), rs.getString("storage_key"), rs.getInt("version")))
                }
                output
            }
        }
    }
}
