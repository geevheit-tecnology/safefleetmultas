const { buildPreventiveAnalysis } = require("../../_aiProvider");
const { organizationId, sendJson, withClient } = require("../../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const [metrics, analyses] = await Promise.all([
      client.query(
        `
        select
          count(*)::int as "totalCases",
          count(*) filter (where category ilike '%CIOT%')::int as "ciotCases",
          count(*) filter (where risk_level in ('HIGH','CRITICAL'))::int as "highRiskCases",
          coalesce(avg(risk_score), 0)::float as "averageRiskScore"
        from regulatory_cases
        where organization_id = $1
        `,
        [orgId]
      ),
      client.query(
        `
        select a.id, c.case_number as "caseNumber", a.provider, a.analysis_type as "analysisType",
               a.content, coalesce(a.source_reference, '') as "sourceReference",
               to_char(a.created_at, 'DD/MM HH24:MI') as "createdAt"
        from ai_analyses a
        join regulatory_cases c on c.id = a.case_id and c.organization_id = a.organization_id
        where a.organization_id = $1
        order by a.created_at desc
        limit 8
        `,
        [orgId]
      )
    ]);

    const preventive = buildPreventiveAnalysis(metrics.rows[0]);
    sendJson(res, 200, {
      metrics: metrics.rows[0],
      preventive,
      analyses: analyses.rows
    });
  });
};
