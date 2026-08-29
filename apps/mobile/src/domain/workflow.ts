export type CaseStatus =
  | "RECEIVED"
  | "TRIAGE"
  | "ANALYSIS"
  | "ACTION_REQUIRED"
  | "IN_TREATMENT"
  | "WAITING_DOCUMENTS"
  | "WAITING_EXTERNAL"
  | "DECISION"
  | "APPEAL"
  | "FINALIZATION"
  | "CLOSED";

export const allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
  RECEIVED: ["TRIAGE"],
  TRIAGE: ["ANALYSIS", "WAITING_DOCUMENTS"],
  ANALYSIS: ["ACTION_REQUIRED", "WAITING_EXTERNAL", "DECISION"],
  ACTION_REQUIRED: ["IN_TREATMENT", "WAITING_DOCUMENTS"],
  IN_TREATMENT: ["WAITING_EXTERNAL", "DECISION", "APPEAL"],
  WAITING_DOCUMENTS: ["ANALYSIS", "ACTION_REQUIRED"],
  WAITING_EXTERNAL: ["DECISION", "APPEAL"],
  DECISION: ["APPEAL", "FINALIZATION"],
  APPEAL: ["DECISION", "FINALIZATION"],
  FINALIZATION: ["CLOSED"],
  CLOSED: []
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return allowedTransitions[from].includes(to);
}
