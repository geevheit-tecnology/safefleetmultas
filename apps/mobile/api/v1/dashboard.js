const { organizationId, sendJson, withClient } = require("../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const result = await client.query(
      `
      select
        count(*) filter (where status <> 'CLOSED')::int as "activeCases",
        count(*) filter (where risk_level = 'CRITICAL')::int as "criticalCases",
        coalesce(sum(amount) filter (where status <> 'CLOSED'), 0)::float as "financialExposure"
      from regulatory_cases
      where organization_id = $1
      `,
      [orgId]
    );
    sendJson(res, 200, {
      organizationName: "Transportadora Demo",
      regulatoryScore: 72,
      ...result.rows[0],
      upcomingDeadlines: 1
    });
  });
};
