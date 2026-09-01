const riskThresholds = {
  lowMax: 24,
  mediumMax: 49,
  highMax: 74
};

const riskWeights = {
  severity: 18,
  amountDivisor: 150,
  amountMax: 30,
  deadlineCritical: 20,
  deadlineHigh: 16,
  deadlineMedium: 10,
  deadlineLow: 4,
  repetition: 8,
  regulatoryImpact: 6
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function classifyRisk(score) {
  if (score <= riskThresholds.lowMax) return "LOW";
  if (score <= riskThresholds.mediumMax) return "MEDIUM";
  if (score <= riskThresholds.highMax) return "HIGH";
  return "CRITICAL";
}

function deadlineScore(deadlineDays) {
  if (deadlineDays <= 1) return riskWeights.deadlineCritical;
  if (deadlineDays <= 3) return riskWeights.deadlineHigh;
  if (deadlineDays <= 7) return riskWeights.deadlineMedium;
  return riskWeights.deadlineLow;
}

function inferSeverity(category, amount) {
  const text = String(category || "").toLowerCase();
  if (text.includes("ciot")) return 3;
  if (text.includes("piso")) return 2;
  if (amount >= 10000) return 2;
  return 1;
}

function inferRegulatoryImpact(category) {
  const text = String(category || "").toLowerCase();
  if (text.includes("ciot") || text.includes("piso")) return 2;
  if (text.includes("document")) return 1;
  return 0;
}

function inferStatusWeight(status) {
  if (status === "ACTION_REQUIRED") return 8;
  if (status === "IN_TREATMENT" || status === "TRIAGE") return 6;
  if (status === "DECISION") return 4;
  return 2;
}

function calculateRiskAssessment(input) {
  const amount = Number(input.amount || 0);
  const severity = Number(input.severity ?? inferSeverity(input.category, amount));
  const deadlineDays = Number(input.deadlineDays ?? 15);
  const repetitions = Number(input.repetitions ?? 0);
  const regulatoryImpact = Number(input.regulatoryImpact ?? inferRegulatoryImpact(input.category));
  const activeStatusWeight = Number(input.activeStatusWeight ?? inferStatusWeight(input.status));
  const amountScore = Math.min(amount / riskWeights.amountDivisor, riskWeights.amountMax);
  const deadlineProximity = deadlineScore(deadlineDays);
  const raw =
    severity * riskWeights.severity +
    amountScore +
    deadlineProximity +
    repetitions * riskWeights.repetition +
    regulatoryImpact * riskWeights.regulatoryImpact +
    activeStatusWeight;
  const score = clampScore(raw);

  return {
    score,
    level: classifyRisk(score),
    explanation:
      "Score calculado por RiskEngine com severidade, valor, proximidade de prazo, repeticao, impacto regulatorio e status do caso.",
    factors: [
      { factor: "severity", weight: severity * riskWeights.severity, value: String(severity) },
      { factor: "amount", weight: amountScore, value: String(amount) },
      { factor: "deadline_proximity", weight: deadlineProximity, value: String(deadlineDays) },
      { factor: "repetition", weight: repetitions * riskWeights.repetition, value: String(repetitions) },
      { factor: "regulatory_impact", weight: regulatoryImpact * riskWeights.regulatoryImpact, value: String(regulatoryImpact) },
      { factor: "case_status", weight: activeStatusWeight, value: String(input.status || "RECEIVED") }
    ]
  };
}

module.exports = { calculateRiskAssessment, classifyRisk, riskThresholds, riskWeights };
