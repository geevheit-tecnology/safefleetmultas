import type { RiskLevel } from "../domain/risk";
import type { CaseStatus } from "../domain/workflow";

export type RegulatoryCase = {
  id: string;
  organizationId: string;
  caseNumber: string;
  infractionNumber?: string;
  processNumber?: string;
  category: string;
  subcategory: string;
  description: string;
  eventDate: string;
  receivedAt: string;
  amount: number;
  status: CaseStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  vehiclePlate?: string;
  driverName?: string;
  rntrc?: string;
  location?: string;
  authority: string;
  responsible: string;
  deadlines: Array<{ id: string; type: string; dueDate: string; daysLeft: number; status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED"; basis: string; startEvent?: string; duration?: number; alertLevel?: string }>;
  actions: Array<{ id: string; title: string; priority: "HIGH" | "MEDIUM" | "LOW"; status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED"; dueDate: string; responsible?: string; completedAt?: string }>;
  documents: Array<{ id: string; name: string; type: string; version: number; storageKey: string }>;
  notes: Array<{ id: string; body: string; author: string; createdAt: string }>;
  decisions: Array<{ id: string; type: string; date: string; finalAmount: number; notes: string }>;
  aiExtractions: Array<{ id: string; provider: string; status: string; documentName: string; extractedData: Record<string, unknown>; confirmedAt?: string }>;
  preventions: Array<{ id: string; causeCategory: string; causeDescription: string; correctiveAction: string; preventionPlan: string; createdAt: string }>;
  riskAssessment?: {
    id: string;
    score: number;
    level: RiskLevel;
    explanation: string;
    createdAt: string;
    factors: Array<{ factor: string; weight: number; value: string }>;
  } | null;
  closureChecklist?: {
    readyToClose: boolean;
    items: Array<{ key: string; label: string; done: boolean }>;
  };
  timeline: Array<{ id: string; date: string; title: string; description: string; user: string }>;
};

export const cases: RegulatoryCase[] = [];

export const dashboard = {
  organizationName: "SafeFleet",
  regulatoryScore: 0,
  scoreComponents: { deadlines: 0, documentation: 0, ciot: 0, floorMinimum: 0, processes: 0, repetition: 0, prevention: 0 },
  scoreDisclaimer: "Indicador interno do sistema; nao representa certificacao oficial.",
  financialExposure: 0,
  criticalCases: 0,
  activeCases: 0,
  closedCases: 0,
  inTreatmentCases: 0,
  upcomingDeadlines: 0,
  overdueDeadlines: 0,
  trends: [],
  regulatoryChanges: []
};
