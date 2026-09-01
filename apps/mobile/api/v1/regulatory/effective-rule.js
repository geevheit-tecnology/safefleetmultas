const { sendJson, withClient } = require("../../_db");

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const occurrenceDate = String(req.query?.occurrenceDate || "").trim();
  const topic = String(req.query?.topic || "").trim();

  if (!isIsoDate(occurrenceDate)) {
    return sendJson(res, 400, {
      error: "validation_error",
      message: "Data da ocorrencia deve estar em YYYY-MM-DD."
    });
  }

  await withClient(res, async (client) => {
    const result = await client.query(
      `
      select
        d.id,
        d.title,
        d.status,
        d.issuing_authority as authority,
        coalesce(d.official_url, '') as source,
        v.version_label as "versionLabel",
        coalesce(v.effective_from::text, '') as "effectiveFrom",
        coalesce(v.effective_until::text, '') as "effectiveUntil",
        coalesce(v.source_hash, d.source_hash, '') as "sourceHash",
        coalesce(v.content, '') as content
      from legal_versions v
      join legal_documents d on d.id = v.legal_document_id
      where (v.effective_from is null or v.effective_from <= $1::date)
        and (v.effective_until is null or v.effective_until >= $1::date)
        and ($2 = '' or d.title ilike '%' || $2 || '%' or v.content ilike '%' || $2 || '%')
      order by v.effective_from desc nulls last, v.created_at desc
      limit 5
      `,
      [occurrenceDate, topic]
    );

    sendJson(res, 200, {
      occurrenceDate,
      topic,
      sourceRule: "Consulta por periodo de vigencia; nao usa apenas a norma atual para ocorrencias historicas.",
      matches: result.rows
    });
  });
};
