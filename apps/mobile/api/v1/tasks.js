const { organizationId, sendJson, withClient } = require("../_db");

const allowedStatuses = new Set(["PENDING", "IN_PROGRESS", "DONE"]);

function mapTask(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number,
    title: row.title,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date || "",
    responsible: row.responsible_name || "Nao definido"
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "GET") return listTasks(req, res);
  if (req.method === "PATCH") return updateTask(req, res);
  return sendJson(res, 405, { error: "method_not_allowed" });
};

async function listTasks(req, res) {
  await withClient(res, async (client) => {
    const result = await client.query(
      `
      select
        a.id,
        a.case_id,
        c.case_number,
        a.title,
        a.priority,
        a.status,
        coalesce(a.due_date::text, '') as due_date,
        u.name as responsible_name
      from case_actions a
      join regulatory_cases c on c.id = a.case_id and c.organization_id = a.organization_id
      left join users u on u.id = a.responsible_user_id
      where a.organization_id = $1
      order by a.due_date nulls last, a.created_at desc
      `,
      [organizationId(req)]
    );
    sendJson(res, 200, result.rows.map(mapTask));
  });
}

async function updateTask(req, res) {
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  const orgId = organizationId(req);

  if (!id || !allowedStatuses.has(status)) {
    return sendJson(res, 400, { error: "validation_error", message: "Tarefa e status valido sao obrigatorios." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const current = await client.query(
        `
        select a.*, c.case_number, u.name as responsible_name
        from case_actions a
        join regulatory_cases c on c.id = a.case_id and c.organization_id = a.organization_id
        left join users u on u.id = a.responsible_user_id
        where a.organization_id = $1 and a.id = $2
        for update of a
        `,
        [orgId, id]
      );

      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      const updated = await client.query(
        `
        update case_actions
        set status = $3,
            completed_at = case when $3 = 'DONE' then now() else null end,
            updated_at = now()
        where organization_id = $1 and id = $2
        returning *
        `,
        [orgId, id, status]
      );

      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'TASK_STATUS_CHANGED', $3)",
        [orgId, current.rows[0].case_id, `Tarefa "${current.rows[0].title}" alterada de ${current.rows[0].status} para ${status}.`]
      );
      await client.query("commit");

      sendJson(res, 200, mapTask({ ...updated.rows[0], case_number: current.rows[0].case_number, responsible_name: current.rows[0].responsible_name }));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
