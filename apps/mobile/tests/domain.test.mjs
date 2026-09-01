import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const riskSource = readFileSync(new URL("../src/domain/risk.ts", import.meta.url), "utf8");
const workflowSource = readFileSync(new URL("../src/domain/workflow.ts", import.meta.url), "utf8");
const require = createRequire(import.meta.url);
const { assertSafeAiAnalysis, buildCaseSupportAnalysis } = require("../api/_aiProvider.js");
const { sanitizeAuditValue } = require("../api/_auditLogger.js");
const { classifyDeadlineAlert, describeDeadlineAlert } = require("../api/_deadlineEngine.js");
const { buildChannelPlan, notificationChannels, notificationTypes } = require("../api/_notificationEngine.js");
const { calculateRegulatoryScore, scoreComponentKeys } = require("../api/_regulatoryScoreEngine.js");
const { calculateRiskAssessment, classifyRisk, riskThresholds } = require("../api/_riskEngine.js");

assert.match(riskSource, /riskThresholds/);
assert.match(riskSource, /0, Math\.min\(100/);
assert.match(workflowSource, /RECEIVED: \["TRIAGE"\]/);
assert.match(workflowSource, /CLOSED: \[\]/);

const safeAnalysis = buildCaseSupportAnalysis({
  amount: 450.75,
  category: "CIOT",
  risk_level: "HIGH"
});
assert.equal(safeAnalysis.provider, "MOCK_AI_PROVIDER");
assert.throws(
  () =>
    assertSafeAiAnalysis({
      content: "Voce vai ganhar o recurso.",
      sourceReference: "Fonte utilizada: demo"
    }),
  /AI safety violation/
);
assert.deepEqual(riskThresholds, { lowMax: 24, mediumMax: 49, highMax: 74 });
assert.equal(classifyRisk(74), "HIGH");
assert.equal(classifyRisk(75), "CRITICAL");
const riskAssessment = calculateRiskAssessment({
  category: "CIOT",
  amount: 5500,
  deadlineDays: 3,
  repetitions: 2,
  status: "ACTION_REQUIRED"
});
assert.equal(riskAssessment.level, "CRITICAL");
assert.equal(riskAssessment.factors.length, 6);
assert.equal(classifyDeadlineAlert(-1, "PENDING"), "OVERDUE");
assert.equal(classifyDeadlineAlert(1, "PENDING"), "1_DAY");
assert.equal(classifyDeadlineAlert(7, "PENDING"), "7_DAYS");
assert.equal(describeDeadlineAlert("OVERDUE"), "vencido");
assert.deepEqual(notificationChannels, ["in_app", "email", "push", "whatsapp"]);
assert.ok(notificationTypes.includes("DEADLINE_APPROACHING"));
assert.equal(buildChannelPlan("DEADLINE_EXPIRED").email, true);
assert.equal(buildChannelPlan("ACTION_REQUIRED").push, true);
assert.deepEqual(scoreComponentKeys, ["deadlines", "documentation", "ciot", "floorMinimum", "processes", "repetition", "prevention"]);
const maturity = calculateRegulatoryScore(
  { activeCases: 5, totalCases: 5, averageRiskScore: 49.4, ciotCases: 3, floorCases: 1, relatedCases: 1 },
  { totalDeadlines: 3, completedDeadlines: 1 }
);
assert.equal(typeof maturity.score, "number");
assert.match(maturity.disclaimer, /nao representa certificacao oficial/);
assert.deepEqual(sanitizeAuditValue({ action: "ok", token: "secret", storageKey: "hidden", long: "x".repeat(200) }), {
  action: "ok",
  long: `${"x".repeat(160)}...`
});

console.log("domain smoke tests passed");
