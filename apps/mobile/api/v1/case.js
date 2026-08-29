const { organizationId, sendJson, withClient } = require("../_db");

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
  if (body.action === "create_deadline") return createDeadline(req, res, body);
  if (body.action === "complete_deadline") return completeDeadline(req, res, body);
  if (body.action === "attach_document") return attachDocument(req, res, body);
  if (body.action === "add_note") return addNote(req, res, body);
  if (body.action === "register_decision") return registerDecision(req, res, body);
  if (body.action === "prepare_extraction") return prepareExtraction(req, res, body);
  if (body.action === "confirm_extraction") return confirmExtraction(req, res, body);
  return sendJson(res, 400, { error: "unknown_action" });
}

async function createDeadline(req, res, body) {
  const orgId = organizationId(req);
  const caseId = String(body.caseId || "").trim();
  const type = String(body.type || "").trim();
  const dueDate = String(body.dueDate || "").trim();
  const basis = String(body.basis || "").trim() || "NOT_VERIFIED";

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

      await client.query(
        "insert into case_deadlines (organization_id, case_id, deadline_type, legal_basis, due_date, status) values ($1, $2, $3, $4, $5::date, 'PENDING')",
        [orgId, caseId, type, basis, dueDate]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'DEADLINE_CREATED', $3)",
        [orgId, caseId, `Prazo "${type}" criado para ${dueDate} com base ${basis}.`]
      );

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

  const [deadlineResult, actionResult, documentResult, noteResult, decisionResult, extractionResult, eventResult] = await Promise.all([
    client.query("select id, deadline_type as type, due_date::text as \"dueDate\", status, legal_basis as basis, greatest((due_date - current_date), 0)::int as \"daysLeft\" from case_deadlines where organization_id = $1 and case_id = $2 order by due_date", [orgId, id]),
    client.query("select id, title, priority, status, coalesce(due_date::text, '') as \"dueDate\" from case_actions where organization_id = $1 and case_id = $2 order by due_date nulls last", [orgId, id]),
    client.query("select id, name, document_type as type, 1 as version, storage_key as \"storageKey\" from case_documents where organization_id = $1 and case_id = $2 order by created_at desc", [orgId, id]),
    client.query("select n.id, n.body, coalesce(u.name, 'Sistema') as author, to_char(n.created_at, 'DD/MM HH24:MI') as \"createdAt\" from case_notes n left join users u on u.id = n.created_by where n.organization_id = $1 and n.case_id = $2 order by n.created_at desc", [orgId, id]),
    client.query("select id, decision_type as type, coalesce(decision_date::text, '') as date, coalesce(final_amount, 0)::float as \"finalAmount\", coalesce(notes, '') as notes from case_decisions where organization_id = $1 and case_id = $2 order by created_at desc", [orgId, id]),
    client.query("select e.id, e.provider, e.status, coalesce(d.name, 'Documento nao informado') as \"documentName\", e.extracted_data as \"extractedData\", coalesce(e.confirmed_at::text, '') as \"confirmedAt\" from ai_extractions e left join case_documents d on d.id = e.document_id where e.organization_id = $1 and e.case_id = $2 order by e.created_at desc", [orgId, id]),
    client.query("select id, to_char(created_at, 'DD/MM HH24:MI') as date, action as title, coalesce(description, '') as description, coalesce(user_id::text, 'Sistema') as \"user\" from case_events where organization_id = $1 and case_id = $2 order by created_at", [orgId, id])
  ]);

  const row = caseResult.rows[0];
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
    driverName: row.driver_name,
    rntrc: row.rntrc,
    location: row.location,
    authority: row.authority,
    responsible: row.responsible_name || "Nao definido",
    deadlines: deadlineResult.rows,
    actions: actionResult.rows,
    documents: documentResult.rows,
    notes: noteResult.rows,
    decisions: decisionResult.rows,
    aiExtractions: extractionResult.rows,
    timeline: eventResult.rows
  };
}
