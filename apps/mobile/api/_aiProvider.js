function buildCaseSupportAnalysis(regulatoryCase) {
  const amount = Number(regulatoryCase.amount || 0);
  const riskText = regulatoryCase.risk_level === "CRITICAL" || regulatoryCase.risk_level === "HIGH"
    ? "Foi identificado um possivel ponto de atencao por nivel de risco e exposicao financeira."
    : "O caso possui risco inicial menor, mas ainda exige conferencia operacional.";

  return {
    provider: "MOCK_AI_PROVIDER",
    analysisType: "EXECUTIVE_SUMMARY",
    content: [
      riskText,
      `Categoria: ${regulatoryCase.category}. Valor registrado: ${amount.toFixed(2)}.`,
      "Recomenda-se validar documento, prazo e fonte regulatoria antes de qualquer decisao juridica."
    ].join(" "),
    sourceReference: "Dados internos do prontuario e fontes marcadas conforme status de verificacao."
  };
}

function buildPreventiveAnalysis(metrics) {
  return {
    provider: "MOCK_AI_PROVIDER",
    analysisType: "PREVENTIVE_INTELLIGENCE",
    content: `Foram encontrados ${metrics.totalCases} prontuarios e ${metrics.ciotCases} caso(s) CIOT. Possiveis padroes devem ser tratados como apoio operacional e validados por responsavel humano.`,
    sourceReference: "Agregados internos de regulatory_cases; nao substitui analise juridica."
  };
}

module.exports = { buildCaseSupportAnalysis, buildPreventiveAnalysis };
