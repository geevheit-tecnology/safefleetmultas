const { organizationId, sendJson, withClient } = require("../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const id = req.query.id;
  const orgId = organizationId(req);

  if (!id) return sendJson(res, 400, { error: "missing_case_id" });

  await withClient(res, async (client) => {
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

    if (caseResult.rowCount === 0) return sendJson(res, 404, { error: "not_found" });

    const [deadlineResult, actionResult, documentResult, eventResult] = await Promise.all([
      client.query("select id, deadline_type as type, due_date::text as \"dueDate\", status, legal_basis as basis, greatest((due_date - current_date), 0)::int as \"daysLeft\" from case_deadlines where organization_id = $1 and case_id = $2 order by due_date", [orgId, id]),
      client.query("select id, title, priority, status, coalesce(due_date::text, '') as \"dueDate\" from case_actions where organization_id = $1 and case_id = $2 order by due_date nulls last", [orgId, id]),
      client.query("select id, name, document_type as type, 1 as version, storage_key as \"storageKey\" from case_documents where organization_id = $1 and case_id = $2 order by created_at desc", [orgId, id]),
      client.query("select id, to_char(created_at, 'DD/MM HH24:MI') as date, action as title, coalesce(description, '') as description, coalesce(user_id::text, 'Sistema') as \"user\" from case_events where organization_id = $1 and case_id = $2 order by created_at", [orgId, id])
    ]);

    const row = caseResult.rows[0];
    sendJson(res, 200, {
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
      timeline: eventResult.rows
    });
  });
};
