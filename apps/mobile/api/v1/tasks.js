const { organizationId, sendJson, withClient } = require("../_db");
const { recordAuditLog } = require("../_auditLogger");
const { buildChannelPlan, mapNotification, notificationChannels, notificationTypes } = require("../_notificationEngine");

const allowedStatuses = new Set(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]);

function mapTask(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    caseNumber: row.case_number,
    title: row.title,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date || "",
    responsible: row.responsible_name || "Nao definido",
    completedAt: row.completed_at || ""
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "GET") return listTasks(req, res);
  if (req.method === "PATCH") return updateTask(req, res);
  return sendJson(res, 405, { error: "method_not_allowed" });
};

async function listTasks(req, res) {
  if (req.query?.notifications === "1") return listNotifications(req, res);
  if (req.query?.summary === "1") return operationalSummary(req, res);

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
        coalesce(a.completed_at::text, '') as completed_at,
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

async function listNotifications(req, res) {
  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      await client.query(
        `
        insert into notifications (organization_id, type, title, body)
        select $1, 'DEADLINE_APPROACHING', 'Prazo proximo', c.case_number || ' vence em ate 15 dias.'
        from case_deadlines d
        join regulatory_cases c on c.id = d.case_id and c.organization_id = d.organization_id
        where d.organization_id = $1 and d.status = 'PENDING' and d.due_date between current_date and current_date + interval '15 days'
          and not exists (select 1 from notifications n where n.organization_id = $1 and n.type = 'DEADLINE_APPROACHING' and n.body = c.case_number || ' vence em ate 15 dias.')
        `,
        [orgId]
      );
      await client.query(
        `
        insert into notifications (organization_id, type, title, body)
        select $1, 'DEADLINE_EXPIRED', 'Prazo vencido', c.case_number || ' possui prazo vencido.'
        from case_deadlines d
        join regulatory_cases c on c.id = d.case_id and c.organization_id = d.organization_id
        where d.organization_id = $1 and d.status = 'PENDING' and d.due_date < current_date
          and not exists (select 1 from notifications n where n.organization_id = $1 and n.type = 'DEADLINE_EXPIRED' and n.body = c.case_number || ' possui prazo vencido.')
        `,
        [orgId]
      );
      await client.query(
        `
        insert into notifications (organization_id, type, title, body)
        select $1, 'RISK_CHANGED', 'Risco critico', case_number || ' esta em risco CRITICAL.'
        from regulatory_cases
        where organization_id = $1 and risk_level = 'CRITICAL'
          and not exists (select 1 from notifications n where n.organization_id = $1 and n.type = 'RISK_CHANGED' and n.body = case_number || ' esta em risco CRITICAL.')
        `,
        [orgId]
      );
      await client.query(
        `
        insert into notifications (organization_id, type, title, body)
        select $1, 'DOCUMENT_REQUIRED', 'Documento pendente', case_number || ' exige documento para seguir.'
        from regulatory_cases c
        where organization_id = $1 and status in ('WAITING_DOCUMENTS','ACTION_REQUIRED','ANALYSIS')
          and not exists (select 1 from case_documents d where d.organization_id = c.organization_id and d.case_id = c.id)
          and not exists (select 1 from notifications n where n.organization_id = $1 and n.type = 'DOCUMENT_REQUIRED' and n.body = case_number || ' exige documento para seguir.')
        `,
        [orgId]
      );
      await client.query(
        `
        insert into notifications (organization_id, type, title, body)
        select $1, 'LEGAL_CHANGE', 'Alteracao regulatoria', title
        from regulatory_changes c
        where not exists (select 1 from notifications n where n.organization_id = $1 and n.type = 'LEGAL_CHANGE' and n.body = c.title)
        `,
        [orgId]
      );
      await client.query(
        `
        insert into notifications (organization_id, type, title, body)
        select $1, 'ACTION_REQUIRED', 'Acao pendente', c.case_number || ': ' || a.title
        from case_actions a
        join regulatory_cases c on c.id = a.case_id and c.organization_id = a.organization_id
        where a.organization_id = $1 and a.status in ('PENDING','IN_PROGRESS')
          and not exists (select 1 from notifications n where n.organization_id = $1 and n.type = 'ACTION_REQUIRED' and n.body = c.case_number || ': ' || a.title)
        `,
        [orgId]
      );

      const result = await client.query(
        `
        select id, type, title, coalesce(body, '') as body, coalesce(read_at::text, '') as read_at, to_char(created_at, 'DD/MM HH24:MI') as created_at
        from notifications
        where organization_id = $1
        order by created_at desc
        limit 40
        `,
        [orgId]
      );
      await client.query("commit");
      sendJson(res, 200, {
        channels: notificationChannels,
        types: notificationTypes,
        deliveryNote: "Arquitetura preparada para in-app, push, e-mail e WhatsApp futuro; o preview nao envia mensagens externas.",
        unreadCount: result.rows.filter((row) => !row.read_at).length,
        items: result.rows.map(mapNotification)
      });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function operationalSummary(req, res) {
  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const [actions, deadlines, documents, cases] = await Promise.all([
      client.query(
        `
        select
          count(*) filter (where status in ('PENDING','IN_PROGRESS'))::int as "myQueue",
          count(*) filter (where status in ('PENDING','IN_PROGRESS') and due_date = current_date)::int as "todayActions",
          count(*) filter (where priority = 'HIGH' and status in ('PENDING','IN_PROGRESS'))::int as "highPriorityActions"
        from case_actions
        where organization_id = $1
        `,
        [orgId]
      ),
      client.query(
        `
        select
          count(*) filter (where status = 'PENDING' and due_date <= current_date + interval '3 days')::int as "criticalDeadlines",
          count(*) filter (where status = 'PENDING' and due_date < current_date)::int as "overdueDeadlines"
        from case_deadlines
        where organization_id = $1
        `,
        [orgId]
      ),
      client.query(
        `
        select count(*)::int as "pendingDocuments"
        from regulatory_cases c
        where c.organization_id = $1
          and c.status in ('WAITING_DOCUMENTS','ACTION_REQUIRED','ANALYSIS')
          and not exists (
            select 1 from case_documents d where d.organization_id = c.organization_id and d.case_id = c.id
          )
        `,
        [orgId]
      ),
      client.query(
        `
        select
          count(*) filter (where status = 'DECISION')::int as "waitingDecision",
          count(*) filter (where status = 'WAITING_DOCUMENTS')::int as "waitingDocuments"
        from regulatory_cases
        where organization_id = $1
        `,
        [orgId]
      )
    ]);

    sendJson(res, 200, {
      ...actions.rows[0],
      ...deadlines.rows[0],
      ...documents.rows[0],
      ...cases.rows[0]
    });
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
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "TASK_STATUS_CHANGED",
        entity: "case_actions",
        entityId: id,
        oldValue: { status: current.rows[0].status },
        newValue: { status }
      });
      if (status === "DONE") {
        await client.query(
          "insert into notifications (organization_id, type, title, body) values ($1, 'ACTION_REQUIRED', 'Acao concluida', $2)",
          [orgId, `Tarefa "${current.rows[0].title}" concluida em ${current.rows[0].case_number}.`]
        );
      }
      await client.query("commit");

      sendJson(res, 200, mapTask({ ...updated.rows[0], case_number: current.rows[0].case_number, responsible_name: current.rows[0].responsible_name }));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}
