const { buildCaseSupportAnalysis } = require("../../_aiProvider");
const { organizationId, sendJson, withClient } = require("../../_db");

function canWriteIntelligence(req) {
  const configuredToken = process.env.INTELLIGENCE_WRITE_TOKEN;
  const requestToken = req.headers["x-intelligence-token"];
  return Boolean(configuredToken && requestToken === configuredToken);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });
  if (!canWriteIntelligence(req)) {
    return sendJson(res, 403, {
      error: "forbidden",
      message: "Analises de IA persistidas exigem token de escrita no servidor."
    });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const caseId = String(body.caseId || "").trim();
  const orgId = organizationId(req);

  if (!caseId) return sendJson(res, 400, { error: "validation_error", message: "Prontuario e obrigatorio." });

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const caseResult = await client.query(
        "select * from regulatory_cases where organization_id = $1 and id = $2 for update",
        [orgId, caseId]
      );
      if (caseResult.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      const analysis = buildCaseSupportAnalysis(caseResult.rows[0]);
      const created = await client.query(
        `
        insert into ai_analyses (organization_id, case_id, provider, analysis_type, content, source_reference)
        values ($1, $2, $3, $4, $5, $6)
        returning id, provider, analysis_type as "analysisType", content, source_reference as "sourceReference", to_char(created_at, 'DD/MM HH24:MI') as "createdAt"
        `,
        [orgId, caseId, analysis.provider, analysis.analysisType, analysis.content, analysis.sourceReference]
      );
      await client.query(
        "insert into case_events (organization_id, case_id, action, description) values ($1, $2, 'AI_ANALYSIS_CREATED', $3)",
        [orgId, caseId, "Analise de apoio criada pela inteligencia SafeFleet. Requer validacao humana."]
      );
      await client.query("commit");
      sendJson(res, 201, { ...created.rows[0], caseId });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
};
