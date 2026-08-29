import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const riskSource = readFileSync(new URL("../src/domain/risk.ts", import.meta.url), "utf8");
const workflowSource = readFileSync(new URL("../src/domain/workflow.ts", import.meta.url), "utf8");

assert.match(riskSource, /riskThresholds/);
assert.match(riskSource, /0, Math\.min\(100/);
assert.match(workflowSource, /RECEIVED: \["TRIAGE"\]/);
assert.match(workflowSource, /CLOSED: \[\]/);

console.log("domain smoke tests passed");
