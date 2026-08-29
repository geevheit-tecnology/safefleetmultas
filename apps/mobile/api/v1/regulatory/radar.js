const { sendJson, withClient } = require("../../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  await withClient(res, async (client) => {
    const result = await client.query(
      `
      select
        c.id,
        c.title,
        coalesce(c.summary, '') as detail,
        c.impact_level as impact,
        coalesce(d.title, 'Sem norma vinculada') as "legalDocument",
        to_char(c.detected_at, 'DD/MM HH24:MI') as "detectedAt",
        coalesce(c.source_url, '') as source
      from regulatory_changes c
      left join legal_documents d on d.id = c.legal_document_id
      order by c.detected_at desc
      `
    );
    sendJson(res, 200, result.rows);
  });
};
