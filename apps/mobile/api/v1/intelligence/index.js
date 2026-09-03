const { sendJson } = require("../../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  sendJson(res, 200, {
    protected: true,
    metrics: {
      totalCases: 0,
      ciotCases: 0,
      highRiskCases: 0,
      averageRiskScore: 0
    },
    preventive: {
      provider: "SafeFleet Intelligence",
      analysisType: "PREVENTIVE_INTELLIGENCE",
      content:
        "Camada de IA preparada para leitura documental, classificacao regulatoria, resumo executivo e inteligencia preventiva. No preview publico, dados internos e analises persistidas ficam protegidos.",
      sourceReference: "Resumo publico seguro da arquitetura de IA; execucao com dados reais exige contexto autenticado."
    },
    analyses: []
  });
};
