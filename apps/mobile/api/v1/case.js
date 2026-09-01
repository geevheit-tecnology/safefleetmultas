const { organizationId, sendJson, withClient } = require("../_db");
const { recordAuditLog } = require("../_auditLogger");
const { ACTION_PERMISSIONS, authorize } = require("../_authz");
const { classifyDeadlineAlert } = require("../_deadlineEngine");
const { recordOutboxEvent } = require("../_events");
const { minimizePersonName } = require("../_privacy");

const allowedTransitions = {
  RECEIVED: ["TRIAGE"],
  TRIAGE: ["ANALYSIS", "WAITING_DOCUMENTS"],
  ANALYSIS: ["ACTION_REQUIRED", "WAITING_EXTERNAL", "DECISION"],
  ACTION_REQUIRED: ["IN_TREATMENT", "WAITING_DOCUMENTS"],
  IN_TREATMENT: ["WAITING_EXTERNAL", "DECISION", "APPEAL"],
  WAITING_DOCUMENTS: ["ANALYSIS", "ACTION_REQUIRED"],
  WAITING_EXTERNAL: ["DECISION", "APPEAL"],
  DECISION: ["APPEAL", "FINALIZATION"],
  APPEAL: ["DECISION", "FINALIZATION"],
  FINALIZATION: ["CLOSED"],
  CLOSED: []
};

const allowedRelationshipTypes = new Set(["POSSIBLE_REPETITION", "RELATED_CASE"]);
const allowedDocumentMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxDocumentSizeBytes = 15 * 1024 * 1024;
const preventionCategories = new Set([
  "OPERATIONAL_FAILURE",
  "DOCUMENT_FAILURE",
  "PROCESS_FAILURE",
  "HUMAN_FAILURE",
  "SYSTEM_FAILURE",
  "THIRD_PARTY",
  "UNKNOWN"
]);

function scoreRelationshipSuggestion(source, target) {
  const reasons = [];
  if (source.category && target.category && source.category.toLowerCase() === target.category.toLowerCase()) reasons.push("tema");
  if (source.subcategory && target.subcategory && source.subcategory.toLowerCase() === target.subcategory.toLowerCase()) reasons.push("infracao");
  if (source.vehicle_plate && target.vehicle_plate && source.vehicle_plate === target.vehicle_plate) reasons.push("empresa/veiculo");
  if (source.rntrc && target.rntrc && source.rntrc === target.rntrc) reasons.push("empresa/RNTRC");
  return reasons;
}

async function buildClosureChecklist(client, orgId, caseId) {
  const result = await client.query(
    `
    select
      exists(select 1 from case_decisions where organization_id = $1 and case_id = $2) as "finalSituationRegistered",
      exists(select 1 from case_documents where organization_id = $1 and case_id = $2 and document_type in ('DECISION','DECISAO','FINAL_DECISION')) as "decisionDocumentAttached",
      exists(select 1 from case_decisions where organization_id = $1 and case_id = $2 and final_amount is not null) as "finalAmountUpdated",
      not exists(select 1 from case_actions where organization_id = $1 and case_id = $2 and status in ('PENDING','IN_PROGRESS')) as "obligationsCompleted",
      not exists(select 1 from case_deadlines where organization_id = $1 and case_id = $2 and status = 'PENDING') as "deadlinesClosed",
      exists(select 1 from case_events where organization_id = $1 and case_id = $2 and action = 'CLOSURE_CONFIRMED') as "responsibleConfirmed",
      exists(select 1 from case_events where organization_id = $1 and case_id = $2) as "historyComplete"
    `,
    [orgId, caseId]
  );
  const checks = result.rows[0];
  const items = [
    { key: "finalSituationRegistered", label: "situacao final registrada", done: checks.finalSituationRegistered },
    { key: "decisionDocumentAttached", label: "decisao/documento anexado", done: checks.decisionDocumentAttached },
    { key: "finalAmountUpdated", label: "valor final atualizado", done: checks.finalAmountUpdated },
    { key: "obligationsCompleted", label: "obrigacoes cumpridas", done: checks.obligationsCompleted },
    { key: "deadlinesClosed", label: "prazos encerrados", done: checks.deadlinesClosed },
    { key: "responsibleConfirmed", label: "responsavel confirmou", done: checks.responsibleConfirmed },
    { key: "historyComplete", label: "historico completo", done: checks.historyComplete }
  ];
  return {
    readyToClose: items.every((item) => item.done),
    items
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "GET") return getCase(req, res);
  if (req.method === "POST") return handleCaseAction(req, res);
  if (req.method === "PATCH") return updateStatus(req, res);
  return sendJson(res, 405, { error: "method_not_allowed" });
};

async function getCase(req, res) {
  const id = req.query.id;
  if (!id) return sendJson(res, 400, { error: "missing_case_id" });

  await withClient(res, async (client) => {
    const authz = await authorize(client, req, organizationId(req), ACTION_PERMISSIONS.read_case);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    const payload = await loadCase(client, organizationId(req), id);
    if (!payload) return sendJson(res, 404, { error: "not_found" });
    sendJson(res, 200, payload);
  });
}

async function updateStatus(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const id = String(body.id || "").trim();
  const nextStatus = String(body.status || "").trim();
  const reason = String(body.reason || "").trim() || `Status alterado para ${nextStatus}.`;
  const orgId = organizationId(req);

  if (!id || !allowedTransitions[nextStatus]) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario e status valido sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    const permission = nextStatus === "CLOSED" ? ACTION_PERMISSIONS.close_case : ACTION_PERMISSIONS.update_case;
    const authz = await authorize(client, req, orgId, permission);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    await client.query("begin");
    try {
      const current = await client.query(
        "select id, status from regulatory_cases where organization_id = $1 and id = $2 for update",
        [orgId, id]
      );

      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      const oldStatus = current.rows[0].status;
      if (!allowedTransitions[oldStatus].includes(nextStatus)) {
        await client.query("rollback");
        return sendJson(res, 409, { error: "invalid_transition", message: `Transicao ${oldStatus} -> ${nextStatus} nao permitida.` });
      }
      if (nextStatus === "CLOSED") {
        const closureChecklist = await buildClosureChecklist(client, orgId, id);
        if (!closureChecklist.readyToClose) {
          await client.query("rollback");
          return sendJson(res, 409, {
            error: "closure_checklist_incomplete",
            message: "Alta regulatoria incompleta. Encerramento exige checklist validado.",
            closureChecklist
          });
        }
      }

      await client.query(
        "update regulatory_cases set status = $3::case_status, updated_at = now(), closed_at = case when $3::case_status = 'CLOSED'::case_status then now() else closed_at end where organization_id = $1 and id = $2",
        [orgId, id, nextStatus]
      );
      await client.query(
        "insert into case_status_history (organization_id, case_id, old_status, new_status, reason) values ($1, $2, $3::case_status, $4::case_status, $5)",
        [orgId, id, oldStatus, nextStatus, reason]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'STATUS_CHANGED', $3)",
        [orgId, id, `Status alterado de ${oldStatus} para ${nextStatus}. ${reason}`]
      );
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: id,
        eventType: nextStatus === "CLOSED" ? "CASE_CLOSED" : "CASE_STATUS_CHANGED",
        payload: { oldStatus, nextStatus, reason }
      });
      await recordAuditLog(client, req, {
        organizationId: orgId,
        userId: authz.userId,
        action: "STATUS_CHANGED",
        entity: "regulatory_cases",
        entityId: id,
        oldValue: { status: oldStatus },
        newValue: { status: nextStatus, reason }
      });

      const payload = await loadCase(client, orgId, id);
      await client.query("commit");
      sendJson(res, 200, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function handleCaseAction(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const requiredPermission = permissionForCaseAction(body.action);
  if (requiredPermission) {
    let blocked = false;
    await withClient(res, async (client) => {
      const authz = await authorize(client, req, organizationId(req), requiredPermission);
      if (!authz.ok) {
        blocked = true;
        return sendJson(res, authz.status, { error: authz.error, message: authz.message });
      }
    });
    if (blocked) return;
  }
  if (body.action === "create_deadline") return createDeadline(req, res, body);
  if (body.action === "complete_deadline") return completeDeadline(req, res, body);
  if (body.action === "create_action") return createAction(req, res, body);
  if (body.action === "confirm_closure") return confirmClosure(req, res, body);
  if (body.action === "create_prevention") return createPrevention(req, res, body);
  if (body.action === "attach_document") return attachDocument(req, res, body);
  if (body.action === "add_note") return addNote(req, res, body);
  if (body.action === "register_decision") return registerDecision(req, res, body);
  if (body.action === "prepare_extraction") return prepareExtraction(req, res, body);
  if (body.action === "confirm_extraction") return confirmExtraction(req, res, body);
  if (body.action === "suggest_relationships") return suggestRelationships(req, res, body);
  if (body.action === "validate_relationship") return validateRelationship(req, res, body);
  return sendJson(res, 400, { error: "unknown_action" });
}

function permissionForCaseAction(action) {
  if (action === "attach_document" || action === "prepare_extraction" || action === "confirm_extraction") return ACTION_PERMISSIONS.upload_document;
  if (action === "suggest_relationships") return ACTION_PERMISSIONS.read_risk;
  if (action === "validate_relationship") return ACTION_PERMISSIONS.manage_risk;
  if (action === "confirm_closure") return ACTION_PERMISSIONS.close_case;
  if (action === "create_deadline" || action === "complete_deadline" || action === "create_action" || action === "create_prevention" || action === "add_note" || action === "register_decision") return ACTION_PERMISSIONS.update_case;
  return null;
}

async function createPrevention(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const causeCategory = String(body.causeCategory || "UNKNOWN").trim();
  const causeDescription = String(body.causeDescription || "").trim();
  const correctiveAction = String(body.correctiveAction || "").trim();
  const preventionPlan = String(body.preventionPlan || "").trim();

  if (!caseId || !preventionCategories.has(causeCategory) || !causeDescription || !correctiveAction || !preventionPlan) {
    return sendJson(res, 400, {
      error: "validation_error",
      message: "Prontuario, causa, acao corretiva e plano de prevencao sao obrigatorios."
    });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      await client.query(
        `
        insert into case_preventions (organization_id, case_id, cause_category, cause_description, corrective_action, prevention_plan)
        values ($1, $2, $3, $4, $5, $6)
        `,
        [orgId, caseId, causeCategory, causeDescription, correctiveAction, preventionPlan]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'PREVENTION_CREATED', $3)",
        [orgId, caseId, `Prevencao registrada: ${causeCategory}. Multa convertida em aprendizado operacional.`]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "PREVENTION_CREATED",
        entity: "case_preventions",
        entityId: caseId,
        newValue: { causeCategory, correctiveAction, preventionPlan }
      });
      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function confirmClosure(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  if (!caseId) return sendJson(res, 400, { error: "validation_error", message: "Prontuario e obrigatorio." });

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'CLOSURE_CONFIRMED', 'Responsavel confirmou checklist de alta regulatoria.')",
        [orgId, caseId]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "CLOSURE_CONFIRMED",
        entity: "regulatory_cases",
        entityId: caseId,
        newValue: { confirmed: true }
      });
      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 200, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function suggestRelationships(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  if (!caseId) return sendJson(res, 400, { error: "validation_error", message: "Prontuario e obrigatorio." });

  await withClient(res, async (client) => {
    const sourceResult = await client.query("select * from regulatory_cases where organization_id = $1 and id = $2", [orgId, caseId]);
    if (sourceResult.rowCount === 0) return sendJson(res, 404, { error: "not_found" });
    const source = sourceResult.rows[0];

    const candidates = await client.query(
      `
      select id, case_number, category, subcategory, vehicle_plate, rntrc, risk_score, risk_level, status
      from regulatory_cases
      where organization_id = $1
        and id <> $2
        and (
          lower(category) = lower($3)
          or ($4 <> '' and lower(coalesce(subcategory, '')) = lower($4))
          or ($5 <> '' and vehicle_plate = $5)
          or ($6 <> '' and rntrc = $6)
        )
      order by created_at desc
      limit 8
      `,
      [orgId, caseId, source.category, source.subcategory || "", source.vehicle_plate || "", source.rntrc || ""]
    );

    const existing = await client.query(
      "select source_case_id, target_case_id from case_relationships where organization_id = $1 and (source_case_id = $2 or target_case_id = $2)",
      [orgId, caseId]
    );
    const linkedIds = new Set(existing.rows.flatMap((row) => [row.source_case_id, row.target_case_id]));
    const suggestions = candidates.rows.map((target) => {
      const reasons = scoreRelationshipSuggestion(source, target);
      return {
        targetCaseId: target.id,
        targetCaseNumber: target.case_number,
        category: target.category,
        status: target.status,
        riskScore: target.risk_score,
        riskLevel: target.risk_level,
        relationshipType: reasons.length >= 2 ? "POSSIBLE_REPETITION" : "RELATED_CASE",
        reasons,
        alreadyLinked: linkedIds.has(target.id),
        note: "Relacao sugerida automaticamente; nao constitui conclusao de reincidencia juridica."
      };
    });

    sendJson(res, 200, {
      caseId,
      message: `Foram encontradas ${suggestions.length} ocorrencias semelhantes.`,
      validationRequired: true,
      suggestions
    });
  });
}

async function validateRelationship(req, res, body) {
  const orgId = organizationId(req);
  const sourceCaseId = String(body.sourceCaseId || "").trim();
  const targetCaseId = String(body.targetCaseId || "").trim();
  const relationshipType = String(body.relationshipType || "RELATED_CASE").trim();

  if (!sourceCaseId || !targetCaseId || !allowedRelationshipTypes.has(relationshipType)) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario origem, destino e tipo valido sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const created = await client.query(
        `
        insert into case_relationships (organization_id, source_case_id, target_case_id, relationship_type, validated_at)
        values ($1, $2, $3, $4, now())
        returning id, relationship_type as "relationshipType", validated_at as "validatedAt"
        `,
        [orgId, sourceCaseId, targetCaseId, relationshipType]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'RELATIONSHIP_VALIDATED', $3)",
        [orgId, sourceCaseId, `Relacao ${relationshipType} validada como apoio operacional; sem conclusao juridica automatica.`]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "RELATIONSHIP_VALIDATED",
        entity: "case_relationships",
        entityId: created.rows[0].id,
        newValue: { sourceCaseId, targetCaseId, relationshipType }
      });
      await client.query("commit");
      sendJson(res, 201, created.rows[0]);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function createDeadline(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const type = String(body.type || "").trim();
  const dueDate = String(body.dueDate || "").trim();
  const basis = String(body.basis || "").trim() || "NOT_VERIFIED";
  const startEvent = String(body.startEvent || "RECEIVED").trim();
  const duration = Number(body.duration || 0);

  if (!caseId || !type || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario, tipo e vencimento YYYY-MM-DD sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      const deadline = await client.query(
        "insert into case_deadlines (organization_id, case_id, deadline_type, start_event, legal_basis, duration, due_date, status) values ($1, $2, $3, $4, $5, nullif($6, 0), $7::date, 'PENDING') returning id",
        [orgId, caseId, type, startEvent, basis, duration, dueDate]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'DEADLINE_CREATED', $3)",
        [orgId, caseId, `Prazo "${type}" criado para ${dueDate} com base ${basis}.`]
      );
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: caseId,
        eventType: "DEADLINE_CREATED",
        payload: { deadlineId: deadline.rows[0].id, type, dueDate, basis }
      });
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "DEADLINE_CREATED",
        entity: "case_deadlines",
        entityId: caseId,
        newValue: { type, dueDate, basis, startEvent, duration }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function createAction(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const title = String(body.title || "").trim();
  const priority = String(body.priority || "MEDIUM").trim();
  const dueDate = String(body.dueDate || "").trim();

  if (!caseId || !title || !["HIGH", "MEDIUM", "LOW"].includes(priority)) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario, titulo e prioridade valida sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      await client.query(
        `
        insert into case_actions (organization_id, case_id, title, priority, status, due_date)
        values ($1, $2, $3, $4, 'PENDING', nullif($5, '')::date)
        `,
        [orgId, caseId, title, priority, dueDate]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'TASK_CREATED', $3)",
        [orgId, caseId, `Acao "${title}" criada com prioridade ${priority}${dueDate ? ` e prazo ${dueDate}` : ""}.`]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "TASK_CREATED",
        entity: "case_actions",
        entityId: caseId,
        newValue: { title, priority, dueDate }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function completeDeadline(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const deadlineId = String(body.deadlineId || "").trim();

  if (!caseId || !deadlineId) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario e prazo sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const current = await client.query(
        "select id, deadline_type, status from case_deadlines where organization_id = $1 and case_id = $2 and id = $3 for update",
        [orgId, caseId, deadlineId]
      );
      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      await client.query(
        "update case_deadlines set status = 'COMPLETED', updated_at = now() where organization_id = $1 and case_id = $2 and id = $3",
        [orgId, caseId, deadlineId]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'DEADLINE_COMPLETED', $3)",
        [orgId, caseId, `Prazo "${current.rows[0].deadline_type}" alterado de ${current.rows[0].status} para COMPLETED.`]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "DEADLINE_COMPLETED",
        entity: "case_deadlines",
        entityId: deadlineId,
        oldValue: { status: current.rows[0].status },
        newValue: { status: "COMPLETED" }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 200, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function attachDocument(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const name = String(body.name || "").trim();
  const documentType = String(body.type || "").trim();
  const mimeType = String(body.mimeType || "").trim() || "application/octet-stream";
  const sizeBytes = Number(body.sizeBytes || 0);
  const sha256 = String(body.sha256 || "").trim();
  const storageKey = String(body.storageKey || "").trim();

  if (!caseId || !name || !documentType || !sha256 || !storageKey || sizeBytes < 0) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario, nome, tipo, hash e storage key sao obrigatorios." });
  }
  if (!allowedDocumentMimeTypes.has(mimeType)) {
    return sendJson(res, 400, { error: "invalid_mime_type", message: "Tipo de arquivo nao permitido." });
  }
  if (sizeBytes > maxDocumentSizeBytes) {
    return sendJson(res, 413, { error: "document_too_large", message: "Documento excede 15MB." });
  }
  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    return sendJson(res, 400, { error: "invalid_hash", message: "Hash SHA-256 invalido." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      const document = await client.query(
        `
        insert into case_documents (organization_id, case_id, name, document_type, mime_type, size_bytes, sha256, storage_key)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id
        `,
        [orgId, caseId, name, documentType, mimeType, sizeBytes, sha256, storageKey]
      );
      await client.query(
        "insert into document_versions (organization_id, document_id, version, storage_key, sha256) values ($1, $2, 1, $3, $4)",
        [orgId, document.rows[0].id, storageKey, sha256]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description, document_id) values ($1, $2, 'DOCUMENT_ATTACHED', $3, $4)",
        [orgId, caseId, `Documento "${name}" anexado como ${documentType}.`, document.rows[0].id]
      );
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: caseId,
        eventType: "DOCUMENT_ADDED",
        payload: { documentId: document.rows[0].id, documentType, mimeType, sizeBytes }
      });
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "DOCUMENT_ATTACHED",
        entity: "case_documents",
        entityId: document.rows[0].id,
        newValue: { name, documentType, mimeType, sizeBytes }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function addNote(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const noteBody = String(body.body || "").trim();

  if (!caseId || !noteBody) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario e nota sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      await client.query(
        "insert into case_notes (organization_id, case_id, body) values ($1, $2, $3)",
        [orgId, caseId, noteBody]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'NOTE_ADDED', $3)",
        [orgId, caseId, `Nota interna registrada: ${noteBody.slice(0, 120)}`]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "NOTE_ADDED",
        entity: "case_notes",
        entityId: caseId,
        newValue: { preview: noteBody.slice(0, 80) }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function registerDecision(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const decisionType = String(body.type || "").trim();
  const decisionDate = String(body.date || "").trim();
  const finalAmount = Number(body.finalAmount || 0);
  const notes = String(body.notes || "").trim();

  if (!caseId || !decisionType || !/^\d{4}-\d{2}-\d{2}$/.test(decisionDate)) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario, tipo e data YYYY-MM-DD sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const exists = await client.query("select id from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, caseId]);
      if (exists.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      await client.query(
        "insert into case_decisions (organization_id, case_id, decision_type, decision_date, final_amount, notes) values ($1, $2, $3, $4::date, $5, $6)",
        [orgId, caseId, decisionType, decisionDate, finalAmount || null, notes]
      );
      if (finalAmount > 0) {
        await client.query(
          "update regulatory_cases set amount = $3, updated_at = now() where organization_id = $1 and id = $2",
          [orgId, caseId, finalAmount]
        );
      }
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'DECISION_REGISTERED', $3)",
        [orgId, caseId, `Decisao "${decisionType}" registrada em ${decisionDate}${finalAmount > 0 ? ` com valor final ${finalAmount}.` : "."}`]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "DECISION_REGISTERED",
        entity: "case_decisions",
        entityId: caseId,
        newValue: { decisionType, decisionDate, finalAmount }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function prepareExtraction(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const documentId = String(body.documentId || "").trim();

  if (!caseId || !documentId) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario e documento sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const result = await client.query(
        `
        select c.id as case_id, c.infraction_number, c.category, c.subcategory, c.amount, c.vehicle_plate, c.rntrc,
               d.id as document_id, d.name as document_name, d.document_type
        from regulatory_cases c
        join case_documents d on d.case_id = c.id and d.organization_id = c.organization_id
        where c.organization_id = $1 and c.id = $2 and d.id = $3
        for update of c, d
        `,
        [orgId, caseId, documentId]
      );
      if (result.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      const row = result.rows[0];
      const extractedData = {
        infractionNumber: row.infraction_number,
        category: row.category,
        subcategory: row.subcategory,
        amount: Number(row.amount || 0),
        vehiclePlate: row.vehicle_plate,
        rntrc: row.rntrc,
        documentName: row.document_name,
        warning: "MOCK_OCR: dados de apoio, confirmar manualmente antes de aplicar."
      };

      await client.query(
        "insert into ai_extractions (organization_id, case_id, document_id, provider, status, extracted_data) values ($1, $2, $3, 'MOCK_OCR', 'PENDING_CONFIRMATION', $4::jsonb)",
        [orgId, caseId, documentId, JSON.stringify(extractedData)]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description, document_id) values ($1, $2, 'OCR_PREPARED', $3, $4)",
        [orgId, caseId, `OCR preparado para documento "${row.document_name}". Confirmacao humana obrigatoria.`, documentId]
      );
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "OCR_PREPARED",
        entity: "ai_extractions",
        entityId: documentId,
        newValue: { provider: "MOCK_OCR", status: "PENDING_CONFIRMATION" }
      });

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 201, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function confirmExtraction(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const extractionId = String(body.extractionId || "").trim();

  if (!caseId || !extractionId) {
    return sendJson(res, 400, { error: "validation_error", message: "Prontuario e extracao sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const current = await client.query(
        "select id, status from ai_extractions where organization_id = $1 and case_id = $2 and id = $3 for update",
        [orgId, caseId, extractionId]
      );
      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      await client.query(
        "update ai_extractions set status = 'CONFIRMED', confirmed_at = now() where organization_id = $1 and case_id = $2 and id = $3",
        [orgId, caseId, extractionId]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'OCR_CONFIRMED', $3)",
        [orgId, caseId, `Extracao OCR confirmada manualmente. Status anterior: ${current.rows[0].status}.`]
      );

      const payload = await loadCase(client, orgId, caseId);
      await client.query("commit");
      sendJson(res, 200, payload);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function loadCase(client, orgId, id) {
  const caseResult = await client.query(
    `
    select c.*, u.name as responsible_name
    from regulatory_cases c
    left join users u on u.id = c.responsible_user_id
    where c.organization_id = $1 and c.id = $2
    limit 1
    `,
    [orgId, id]
  );

  if (caseResult.rowCount === 0) return null;

  const [deadlineResult, actionResult, documentResult, noteResult, decisionResult, extractionResult, preventionResult, riskResult, eventResult] = await Promise.all([
    client.query("select id, deadline_type as type, coalesce(start_event, '') as \"startEvent\", coalesce(duration, 0)::int as duration, due_date::text as \"dueDate\", status, legal_basis as basis, (due_date - current_date)::int as \"daysLeft\" from case_deadlines where organization_id = $1 and case_id = $2 order by due_date", [orgId, id]),
    client.query("select a.id, a.title, a.priority, a.status, coalesce(a.due_date::text, '') as \"dueDate\", coalesce(a.completed_at::text, '') as \"completedAt\", coalesce(u.name, 'Nao definido') as responsible from case_actions a left join users u on u.id = a.responsible_user_id where a.organization_id = $1 and a.case_id = $2 order by a.due_date nulls last", [orgId, id]),
    client.query("select id, name, document_type as type, 1 as version, storage_key as \"storageKey\" from case_documents where organization_id = $1 and case_id = $2 order by created_at desc", [orgId, id]),
    client.query("select n.id, n.body, coalesce(u.name, 'Sistema') as author, to_char(n.created_at, 'DD/MM HH24:MI') as \"createdAt\" from case_notes n left join users u on u.id = n.created_by where n.organization_id = $1 and n.case_id = $2 order by n.created_at desc", [orgId, id]),
    client.query("select id, decision_type as type, coalesce(decision_date::text, '') as date, coalesce(final_amount, 0)::float as \"finalAmount\", coalesce(notes, '') as notes from case_decisions where organization_id = $1 and case_id = $2 order by created_at desc", [orgId, id]),
    client.query("select e.id, e.provider, e.status, coalesce(d.name, 'Documento nao informado') as \"documentName\", e.extracted_data as \"extractedData\", coalesce(e.confirmed_at::text, '') as \"confirmedAt\" from ai_extractions e left join case_documents d on d.id = e.document_id where e.organization_id = $1 and e.case_id = $2 order by e.created_at desc", [orgId, id]),
    client.query("select id, cause_category as \"causeCategory\", cause_description as \"causeDescription\", corrective_action as \"correctiveAction\", prevention_plan as \"preventionPlan\", to_char(created_at, 'DD/MM HH24:MI') as \"createdAt\" from case_preventions where organization_id = $1 and case_id = $2 order by created_at desc", [orgId, id]),
    client.query(`
      select
        ra.id,
        ra.score,
        ra.level,
        coalesce(ra.explanation, '') as explanation,
        to_char(ra.created_at, 'DD/MM HH24:MI') as "createdAt",
        coalesce(
          json_agg(
            json_build_object('factor', rf.factor, 'weight', rf.weight::float, 'value', rf.value)
            order by rf.factor
          ) filter (where rf.id is not null),
          '[]'::json
        ) as factors
      from risk_assessments ra
      left join risk_factors rf on rf.risk_assessment_id = ra.id
      where ra.organization_id = $1 and ra.case_id = $2
      group by ra.id
      order by ra.created_at desc
      limit 1
    `, [orgId, id]),
    client.query("select id, to_char(created_at, 'DD/MM HH24:MI') as date, action as title, coalesce(description, '') as description, coalesce(user_id::text, 'Sistema') as \"user\" from case_events where organization_id = $1 and case_id = $2 order by created_at", [orgId, id])
  ]);

  const row = caseResult.rows[0];
  const closureChecklist = await buildClosureChecklist(client, orgId, id);
  return {
    id: row.id,
    organizationId: row.organization_id,
    caseNumber: row.case_number,
    infractionNumber: row.infraction_number,
    category: row.category,
    subcategory: row.subcategory || "",
    description: row.description || "",
    eventDate: row.event_date || "",
    receivedAt: row.received_at || "",
    amount: Number(row.amount || 0),
    status: row.status,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    vehiclePlate: row.vehicle_plate,
    driverName: minimizePersonName(row.driver_name),
    rntrc: row.rntrc,
    location: row.location,
    authority: row.authority,
    responsible: row.responsible_name || "Nao definido",
    deadlines: deadlineResult.rows.map((deadline) => ({
      ...deadline,
      daysLeft: Math.max(deadline.daysLeft, 0),
      alertLevel: classifyDeadlineAlert(deadline.daysLeft, deadline.status)
    })),
    actions: actionResult.rows,
    documents: documentResult.rows,
    notes: noteResult.rows,
    decisions: decisionResult.rows,
    aiExtractions: extractionResult.rows,
    preventions: preventionResult.rows,
    riskAssessment: riskResult.rows[0] || null,
    closureChecklist,
    timeline: eventResult.rows
  };
}
