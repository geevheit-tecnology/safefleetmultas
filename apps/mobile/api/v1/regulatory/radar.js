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
        coalesce(c.source_url, '') as source,
        case
          when c.title ilike '%CIOT%' or coalesce(c.summary, '') ilike '%CIOT%' or coalesce(d.title, '') ilike '%CIOT%' then 'CIOT'
          when c.title ilike '%piso%' or coalesce(c.summary, '') ilike '%piso%' or coalesce(d.title, '') ilike '%piso%' then 'PISO_MINIMO'
          when c.title ilike '%prazo%' or coalesce(c.summary, '') ilike '%prazo%' then 'PRAZO_PROCESSUAL'
          else 'GERAL'
        end as topic,
        (
          select count(*)::int
          from regulatory_cases rc
          where
            (c.title ilike '%CIOT%' or coalesce(c.summary, '') ilike '%CIOT%' or coalesce(d.title, '') ilike '%CIOT%') and rc.category ilike '%CIOT%'
            or (c.title ilike '%piso%' or coalesce(c.summary, '') ilike '%piso%' or coalesce(d.title, '') ilike '%piso%') and rc.category ilike '%piso%'
            or (c.title ilike '%prazo%' or coalesce(c.summary, '') ilike '%prazo%') and exists (
              select 1 from case_deadlines dl where dl.case_id = rc.id and dl.status = 'PENDING'
            )
        ) as "relatedCases",
        (
          select count(*)::int
          from regulatory_cases rc
          where rc.risk_level in ('HIGH','CRITICAL')
            and (
              ((c.title ilike '%CIOT%' or coalesce(c.summary, '') ilike '%CIOT%' or coalesce(d.title, '') ilike '%CIOT%') and rc.category ilike '%CIOT%')
              or ((c.title ilike '%piso%' or coalesce(c.summary, '') ilike '%piso%' or coalesce(d.title, '') ilike '%piso%') and rc.category ilike '%piso%')
              or ((c.title ilike '%prazo%' or coalesce(c.summary, '') ilike '%prazo%') and exists (
                select 1 from case_deadlines dl where dl.case_id = rc.id and dl.status = 'PENDING'
              ))
            )
        ) as "potentiallyAffected",
        'Analise automatica de apoio; exige validacao humana antes de conclusao juridica.' as "analysisNote"
      from regulatory_changes c
      left join legal_documents d on d.id = c.legal_document_id
      order by c.detected_at desc
      `
    );
    sendJson(res, 200, result.rows);
  });
};
