export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskInput = {
  severity: number;
  amount: number;
  deadlineDays: number;
  repetitions: number;
  regulatoryImpact: number;
  activeStatusWeight: number;
};

export const riskThresholds = {
  lowMax: 24,
  mediumMax: 49,
  highMax: 74
};

export function calculateRiskScore(input: RiskInput): number {
  const amountScore = Math.min(input.amount / 150, 30);
  const deadlineScore = input.deadlineDays <= 1 ? 20 : input.deadlineDays <= 3 ? 16 : input.deadlineDays <= 7 ? 10 : 4;
  const raw =
    input.severity * 18 +
    amountScore +
    deadlineScore +
    input.repetitions * 8 +
    input.regulatoryImpact * 6 +
    input.activeStatusWeight;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function classifyRisk(score: number): RiskLevel {
  if (score <= riskThresholds.lowMax) return "LOW";
  if (score <= riskThresholds.mediumMax) return "MEDIUM";
  if (score <= riskThresholds.highMax) return "HIGH";
  return "CRITICAL";
}
