const scoreComponentKeys = [
  "deadlines",
  "documentation",
  "ciot",
  "floorMinimum",
  "processes",
  "repetition",
  "prevention"
];

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateRegulatoryScore(metrics, deadlines) {
  const totalDeadlines = Number(deadlines.totalDeadlines || 0);
  const completedDeadlines = Number(deadlines.completedDeadlines || 0);
  const activeCases = Number(metrics.activeCases || 0);
  const totalCases = Number(metrics.totalCases || 0);
  const averageRiskScore = Number(metrics.averageRiskScore || 0);
  const ciotCases = Number(metrics.ciotCases || 0);
  const floorCases = Number(metrics.floorCases || 0);
  const relatedCases = Number(metrics.relatedCases || 0);

  const deadlineScore = totalDeadlines === 0 ? 85 : clamp((completedDeadlines / totalDeadlines) * 100);
  const documentationScore = totalCases === 0 ? 100 : clamp(100 - activeCases * 4);
  const riskScore = clamp(100 - averageRiskScore);
  const components = {
    deadlines: deadlineScore,
    documentation: documentationScore,
    ciot: ciotCases > 0 ? Math.max(40, riskScore) : 90,
    floorMinimum: floorCases > 0 ? Math.max(45, riskScore) : 90,
    processes: Math.max(45, documentationScore),
    repetition: relatedCases > 0 ? Math.max(35, riskScore - relatedCases * 5) : Math.max(50, riskScore),
    prevention: Math.max(50, clamp((deadlineScore + riskScore) / 2))
  };
  const score = clamp(scoreComponentKeys.reduce((sum, key) => sum + components[key], 0) / scoreComponentKeys.length);

  return {
    score,
    components,
    disclaimer: "Indicador interno do sistema; nao representa certificacao oficial."
  };
}

module.exports = { calculateRegulatoryScore, scoreComponentKeys };
