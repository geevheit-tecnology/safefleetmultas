const { sendJson, withClient } = require("../../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  await withClient(res, async (client) => {
    const result = await client.query(
      `
      select
        d.id,
        d.title,
        coalesce(d.number, '') as number,
        d.year,
        d.type,
        d.status,
        coalesce(d.effective_from::text, 'vigencia a confirmar') as effective,
        coalesce(d.effective_from::text, '') as "effectiveFrom",
        coalesce(d.effective_until::text, '') as "effectiveUntil",
        d.issuing_authority as authority,
        coalesce(d.official_url, '') as source,
        coalesce(d.source_hash, '') as "sourceHash",
        count(v.id)::int as versions,
        coalesce(max(v.version_label), 'sem versao') as "currentVersion"
      from legal_documents d
      left join legal_versions v on v.legal_document_id = d.id
      group by d.id, d.title, d.number, d.year, d.type, d.status, d.effective_from, d.effective_until, d.issuing_authority, d.official_url, d.source_hash
      order by d.title
      `
    );
    sendJson(res, 200, result.rows);
  });
};
