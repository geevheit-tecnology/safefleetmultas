const { organizationId, sendJson, withClient } = require("../../_db");

function mapCase(row) {
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
    deadlines: [],
    actions: [],
    documents: [],
    timeline: []
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "POST") return createCase(req, res);
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  await withClient(res, async (client) => {
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
  const category = String(body.category || "").trim();
  const subcategory = String(body.subcategory || "").trim();
  const description = String(body.description || "").trim();
  const vehiclePlate = String(body.vehiclePlate || "").trim().toUpperCase();
  const rntrc = String(body.rntrc || "").trim();
  const amount = Number(body.amount || 0);

  if (!infractionNumber || !category) {
    return sendJson(res, 400, { error: "validation_error", message: "Numero do auto e categoria sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const sequence = await client.query("select count(*)::int + 1 as next from regulatory_cases where organization_id = $1", [orgId]);
      const caseNumber = `AC-${new Date().getFullYear()}-${String(sequence.rows[0].next).padStart(3, "0")}`;
      const created = await client.query(
        `
        insert into regulatory_cases (
          organization_id, case_number, infraction_number, category, subcategory, description,
          event_date, received_at, amount, status, risk_score, risk_level, vehicle_plate,
          rntrc, authority, source
        )
        values ($1, $2, $3, $4, $5, $6, current_date, current_date, $7, 'RECEIVED', 0, 'LOW', $8, $9, 'ANTT', 'WEB')
        returning *
        `,
        [orgId, caseNumber, infractionNumber, category, subcategory, description, amount, vehiclePlate || null, rntrc || null]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'CASE_CREATED', 'Prontuario criado pelo formulario web.')",
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
