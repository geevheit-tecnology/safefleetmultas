const { organizationId, sendJson, withClient } = require("../../_db");
const { ACTION_PERMISSIONS, authorize } = require("../../_authz");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.read_reports);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    const [org, overview, byStatus, byRisk, byCategory, deadlines, events] = await Promise.all([
      client.query("select name from organizations where id = $1", [orgId]),
      client.query(
        `
        select
          count(*)::int as "totalCases",
          count(*) filter (where status <> 'CLOSED')::int as "activeCases",
          count(*) filter (where status = 'CLOSED')::int as "closedCases",
          count(*) filter (where risk_level = 'CRITICAL')::int as "criticalCases",
          coalesce(sum(amount) filter (where status <> 'CLOSED'), 0)::float as "financialExposure",
          coalesce(avg(risk_score), 0)::float as "averageRiskScore"
        from regulatory_cases
        where organization_id = $1
        `,
        [orgId]
      ),
      client.query(
        `
        select status::text as label, count(*)::int as count, coalesce(sum(amount), 0)::float as amount
        from regulatory_cases
        where organization_id = $1
        group by status
        order by count desc
        `,
        [orgId]
      ),
      client.query(
        `
        select risk_level::text as label, count(*)::int as count, coalesce(sum(amount), 0)::float as amount
        from regulatory_cases
        where organization_id = $1
        group by risk_level
        order by count desc
        `,
        [orgId]
      ),
      client.query(
        `
        select category as label, count(*)::int as count, coalesce(sum(amount), 0)::float as amount
        from regulatory_cases
        where organization_id = $1
        group by category
        order by amount desc
        `,
        [orgId]
      ),
      client.query(
        `
        select
          count(*) filter (where status = 'PENDING')::int as pending,
          count(*) filter (where status = 'PENDING' and due_date < current_date)::int as overdue,
          count(*) filter (where status = 'PENDING' and due_date between current_date and current_date + interval '15 days')::int as upcoming
        from case_deadlines
        where organization_id = $1
        `,
        [orgId]
      ),
      client.query(
        `
        select e.id, c.case_number as "caseNumber", e.action, coalesce(e.description, '') as description, to_char(e.created_at, 'DD/MM HH24:MI') as date
        from case_events e
        join regulatory_cases c on c.id = e.case_id and c.organization_id = e.organization_id
        where e.organization_id = $1
        order by e.created_at desc
        limit 8
        `,
        [orgId]
      )
    ]);

    sendJson(res, 200, {
      organizationName: org.rows[0]?.name || "SafeFleet",
      generatedAt: new Date().toISOString(),
      overview: overview.rows[0],
      byStatus: byStatus.rows,
      byRisk: byRisk.rows,
      byCategory: byCategory.rows,
      deadlines: deadlines.rows[0],
      recentEvents: events.rows
    });
  });
};
