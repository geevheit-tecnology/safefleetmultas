const { organizationId, sendJson, withClient } = require("../_db");
const { calculateRegulatoryScore } = require("../_regulatoryScoreEngine");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const [result, deadlineResult, trendResult, changeResult] = await Promise.all([
      client.query(
      `
      select
        count(*) filter (where status <> 'CLOSED')::int as "activeCases",
        count(*) filter (where status = 'CLOSED')::int as "closedCases",
        count(*) filter (where risk_level = 'CRITICAL')::int as "criticalCases",
        count(*) filter (where status in ('IN_TREATMENT','ACTION_REQUIRED','ANALYSIS','TRIAGE'))::int as "inTreatmentCases",
        coalesce(sum(amount) filter (where status <> 'CLOSED'), 0)::float as "financialExposure",
        coalesce(avg(risk_score), 0)::float as "averageRiskScore",
        count(*)::int as "totalCases",
        count(*) filter (where category ilike '%CIOT%')::int as "ciotCases",
        count(*) filter (where category ilike '%piso%')::int as "floorCases",
        (
          select count(*)::int
          from case_relationships cr
          where cr.organization_id = $1
        ) as "relatedCases"
      from regulatory_cases
      where organization_id = $1
      `,
        [orgId]
      ),
      client.query(
        `
        select
          count(*) filter (where status = 'PENDING' and due_date between current_date and current_date + interval '15 days')::int as "upcomingDeadlines",
          count(*) filter (where status = 'PENDING' and due_date < current_date)::int as "overdueDeadlines",
          count(*) filter (where status = 'COMPLETED')::int as "completedDeadlines",
          count(*)::int as "totalDeadlines"
        from case_deadlines
        where organization_id = $1
        `,
        [orgId]
      ),
      client.query(
        `
        select
          to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
          count(*)::int as cases,
          coalesce(sum(amount), 0)::float as amount
        from regulatory_cases
        where organization_id = $1
        group by date_trunc('month', created_at)
        order by date_trunc('month', created_at) desc
        limit 6
        `,
        [orgId]
      ),
      client.query(
        `
        select title, impact_level as impact, to_char(detected_at, 'DD/MM') as "detectedAt"
        from regulatory_changes
        order by detected_at desc
        limit 3
        `
      )
    ]);
    const metrics = result.rows[0];
    const deadlines = deadlineResult.rows[0];
    const regulatoryScore = calculateRegulatoryScore(metrics, deadlines);
    sendJson(res, 200, {
      organizationName: "Transportadora Demo",
      regulatoryScore: regulatoryScore.score,
      scoreComponents: regulatoryScore.components,
      scoreDisclaimer: regulatoryScore.disclaimer,
      ...metrics,
      upcomingDeadlines: deadlines.upcomingDeadlines,
      overdueDeadlines: deadlines.overdueDeadlines,
      trends: trendResult.rows.reverse(),
      regulatoryChanges: changeResult.rows
    });
  });
};
