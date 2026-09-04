const { organizationId, sendJson, withClient } = require("../../_db");
const { recordAuditLog } = require("../../_auditLogger");
const { ACTION_PERMISSIONS, authorize } = require("../../_authz");
const { recordOutboxEvent } = require("../../_events");
const { minimizePersonName } = require("../../_privacy");
const { calculateRiskAssessment } = require("../../_riskEngine");

function mapCase(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    caseNumber: row.case_number,
    infractionNumber: row.infraction_number,
    processNumber: row.process_number,
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
    deadlines: [],
    actions: [],
    documents: [],
    timeline: []
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "POST") return createCase(req, res);
  if (req.method === "PATCH") return updateCase(req, res);
  if (req.method === "DELETE") return deleteCase(req, res);
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  await withClient(res, async (client) => {
    const authz = await authorize(client, req, organizationId(req), ACTION_PERMISSIONS.list_cases);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    const result = await client.query(
      `
      select c.*, u.name as responsible_name
      from regulatory_cases c
      left join users u on u.id = c.responsible_user_id
      where c.organization_id = $1
      order by c.created_at desc
      `,
      [organizationId(req)]
    );
    sendJson(res, 200, result.rows.map(mapCase));
  });
};

async function createCase(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const orgId = organizationId(req);
  const infractionNumber = String(body.infractionNumber || "").trim();
  const processNumber = String(body.processNumber || "").trim();
  const category = String(body.category || "").trim();
  const subcategory = String(body.subcategory || "").trim();
  const description = String(body.description || "").trim();
  const vehiclePlate = String(body.vehiclePlate || "").trim().toUpperCase();
  const driverName = String(body.driverName || "").trim();
  const rntrc = String(body.rntrc || "").trim();
  const location = String(body.location || "").trim();
  const amount = Number(body.amount || 0);
  const authority = String(body.authority || "Orgao informado").trim();

  if (!infractionNumber || !category) {
    return sendJson(res, 400, { error: "validation_error", message: "Numero do auto e categoria sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.create_case);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    await client.query("begin");
    try {
      const sequence = await client.query("select count(*)::int + 1 as next from regulatory_cases where organization_id = $1", [orgId]);
      const caseNumber = `AC-${new Date().getFullYear()}-${String(sequence.rows[0].next).padStart(3, "0")}`;
      const repetitions = await client.query(
        "select count(*)::int as count from regulatory_cases where organization_id = $1 and category ilike $2",
        [orgId, `%${category}%`]
      );
      const risk = calculateRiskAssessment({
        category,
        amount,
        deadlineDays: 2,
        repetitions: repetitions.rows[0].count,
        status: "RECEIVED"
      });
      const created = await client.query(
        `
        insert into regulatory_cases (
          organization_id, case_number, infraction_number, category, subcategory, description,
          event_date, received_at, amount, status, risk_score, risk_level, vehicle_plate,
          driver_name, rntrc, location, authority, source, process_number
        )
        values ($1, $2, $3, $4, $5, $6, current_date, current_date, $7, 'RECEIVED', $8, $9, $10, $11, $12, $13, $14, 'WEB', $15)
        returning *
        `,
        [orgId, caseNumber, infractionNumber, category, subcategory, description, amount, risk.score, risk.level, vehiclePlate || null, driverName || null, rntrc || null, location || null, authority || "Orgao informado", processNumber || null]
      );
      const assessment = await client.query(
        `
        insert into risk_assessments (organization_id, case_id, score, level, explanation)
        values ($1, $2, $3, $4, $5)
        returning id
        `,
        [orgId, created.rows[0].id, risk.score, risk.level, risk.explanation]
      );
      for (const factor of risk.factors) {
        await client.query(
          "insert into risk_factors (risk_assessment_id, factor, weight, value) values ($1, $2, $3, $4)",
          [assessment.rows[0].id, factor.factor, factor.weight, factor.value]
        );
      }
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'CASE_CREATED', $3)",
        [orgId, created.rows[0].id, `Prontuario criado pelo formulario web. RiskEngine calculou ${risk.score}/100 (${risk.level}).`]
      );
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: created.rows[0].id,
        eventType: "CASE_CREATED",
        payload: { caseNumber, category, riskScore: risk.score, riskLevel: risk.level }
      });
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'RISK_ASSESSED', $3)",
        [orgId, created.rows[0].id, risk.explanation]
      );
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: created.rows[0].id,
        eventType: "RISK_CHANGED",
        payload: { score: risk.score, level: risk.level }
      });
      await recordAuditLog(client, req, {
        organizationId: orgId,
        userId: authz.userId,
        action: "CASE_CREATED",
        entity: "regulatory_cases",
        entityId: created.rows[0].id,
        newValue: { caseNumber, category, amount, riskScore: risk.score, riskLevel: risk.level }
      });
      await client.query(
        `
        insert into case_actions (organization_id, case_id, title, priority, status, due_date)
        values ($1, $2, 'Conferir dados do auto e documentos obrigatorios', 'HIGH', 'PENDING', current_date + interval '2 days')
        `,
        [orgId, created.rows[0].id]
      );
      await client.query("commit");
      sendJson(res, 201, mapCase({ ...created.rows[0], responsible_name: "Nao definido" }));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function updateCase(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const orgId = organizationId(req);
  const id = String(body.id || "").trim();
  if (!id) return sendJson(res, 400, { error: "validation_error", message: "Prontuario obrigatorio." });

  const infractionNumber = String(body.infractionNumber || "").trim();
  const processNumber = String(body.processNumber || "").trim();
  const category = String(body.category || "").trim();
  const subcategory = String(body.subcategory || "").trim();
  const description = String(body.description || "").trim();
  const vehiclePlate = String(body.vehiclePlate || "").trim().toUpperCase();
  const driverName = String(body.driverName || "").trim();
  const rntrc = String(body.rntrc || "").trim();
  const location = String(body.location || "").trim();
  const amount = Number(body.amount || 0);
  const authority = String(body.authority || "Orgao informado").trim();

  if (!infractionNumber || !category) {
    return sendJson(res, 400, { error: "validation_error", message: "Numero do auto e categoria sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.update_case);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    await client.query("begin");
    try {
      const current = await client.query("select * from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, id]);
      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }
      const repetitions = await client.query(
        "select count(*)::int as count from regulatory_cases where organization_id = $1 and id <> $2 and category ilike $3",
        [orgId, id, `%${category}%`]
      );
      const risk = calculateRiskAssessment({
        category,
        amount,
        deadlineDays: 5,
        repetitions: repetitions.rows[0].count,
        status: current.rows[0].status
      });
      const updated = await client.query(
        `
        update regulatory_cases
        set infraction_number = $3,
            category = $4,
            subcategory = $5,
            description = $6,
            amount = $7,
            vehicle_plate = $8,
            rntrc = $9,
            authority = $10,
            risk_score = $11,
            risk_level = $12,
            process_number = $13,
            driver_name = $14,
            location = $15,
            updated_at = now()
        where organization_id = $1 and id = $2
        returning *
        `,
        [orgId, id, infractionNumber, category, subcategory, description, amount, vehiclePlate || null, rntrc || null, authority, risk.score, risk.level, processNumber || null, driverName || null, location || null]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'CASE_UPDATED', $3)",
        [orgId, id, `Dados principais atualizados. RiskEngine recalculou ${risk.score}/100 (${risk.level}).`]
      );
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: id,
        eventType: "CASE_UPDATED",
        payload: { riskScore: risk.score, riskLevel: risk.level }
      });
      await recordAuditLog(client, req, {
        organizationId: orgId,
        userId: authz.userId,
        action: "CASE_UPDATED",
        entity: "regulatory_cases",
        entityId: id,
        oldValue: {
          infractionNumber: current.rows[0].infraction_number,
          category: current.rows[0].category,
          amount: current.rows[0].amount,
          vehiclePlate: current.rows[0].vehicle_plate
        },
        newValue: { infractionNumber, category, amount, vehiclePlate, authority, riskScore: risk.score, riskLevel: risk.level }
      });
      await client.query("commit");
      sendJson(res, 200, mapCase({ ...updated.rows[0], responsible_name: current.rows[0].responsible_name || "Nao definido" }));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function deleteCase(req, res) {
  const orgId = organizationId(req);
  const id = String(new URL(req.url, "http://local").searchParams.get("id") || "").trim();
  if (!id) return sendJson(res, 400, { error: "validation_error", message: "Prontuario obrigatorio." });

  await withClient(res, async (client) => {
    const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.close_case);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    await client.query("begin");
    try {
      const current = await client.query("select * from regulatory_cases where organization_id = $1 and id = $2 for update", [orgId, id]);
      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }
      await recordAuditLog(client, req, {
        organizationId: orgId,
        userId: authz.userId,
        action: "CASE_DELETED",
        entity: "regulatory_cases",
        entityId: id,
        oldValue: {
          caseNumber: current.rows[0].case_number,
          infractionNumber: current.rows[0].infraction_number,
          category: current.rows[0].category,
          amount: current.rows[0].amount
        }
      });
      await recordOutboxEvent(client, {
        organizationId: orgId,
        aggregateId: id,
        eventType: "CASE_DELETED",
        payload: { caseNumber: current.rows[0].case_number }
      });
      await client.query("delete from regulatory_cases where organization_id = $1 and id = $2", [orgId, id]);
      await client.query("commit");
      sendJson(res, 200, { ok: true });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
