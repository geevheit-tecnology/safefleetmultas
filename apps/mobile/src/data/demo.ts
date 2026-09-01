import { calculateRiskScore, classifyRisk, type RiskLevel } from "../domain/risk";
import type { CaseStatus } from "../domain/workflow";

export type RegulatoryCase = {
  id: string;
  organizationId: string;
  caseNumber: string;
  infractionNumber?: string;
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

const riskOne = calculateRiskScore({ severity: 3, amount: 5500, deadlineDays: 3, repetitions: 2, regulatoryImpact: 2, activeStatusWeight: 8 });
const riskTwo = calculateRiskScore({ severity: 2, amount: 10500, deadlineDays: 9, repetitions: 1, regulatoryImpact: 2, activeStatusWeight: 6 });
const riskThree = calculateRiskScore({ severity: 1, amount: 3200, deadlineDays: 15, repetitions: 0, regulatoryImpact: 1, activeStatusWeight: 4 });

export const cases: RegulatoryCase[] = [
  {
    id: "case-001",
    organizationId: "org-demo",
    caseNumber: "AC-2026-001",
    infractionNumber: "AI-00458/2026",
    category: "CIOT",
    subcategory: "Ausencia de CIOT",
    description: "Auto recebido para triagem. Legislação e prazo marcados como NOT_VERIFIED ate validacao humana.",
    eventDate: "2026-08-12",
    receivedAt: "2026-08-14",
    amount: 5500,
    status: "ACTION_REQUIRED",
    riskScore: riskOne,
    riskLevel: classifyRisk(riskOne),
    vehiclePlate: "ABC-1D23",
    driverName: "Jose Carlos Mendes",
    rntrc: "01234567",
    location: "BR-116, BA",
    authority: "ANTT",
    responsible: "Ana Lima",
    deadlines: [{ id: "dl-1", type: "Validar prazo de defesa", dueDate: "2026-09-03", daysLeft: 3, status: "PENDING", basis: "NOT_VERIFIED" }],
    actions: [
      { id: "ac-1", title: "Conferir dados do auto", priority: "HIGH", status: "DONE", dueDate: "2026-08-20" },
      { id: "ac-2", title: "Validar enquadramento legal", priority: "HIGH", status: "IN_PROGRESS", dueDate: "2026-08-29" }
    ],
    documents: [{ id: "doc-1", name: "auto-infracao-demo.pdf", type: "AUTO_INFRINGEMENT", version: 1, storageKey: "demo/org-demo/case-001/auto.pdf" }],
    notes: [],
    decisions: [],
    aiExtractions: [],
    preventions: [],
    riskAssessment: null,
    timeline: [
      { id: "ev-1", date: "14/08 09:15", title: "Auto recebido", description: "Documento registrado no prontuario.", user: "Maria Souza" },
      { id: "ev-2", date: "15/08 09:10", title: "Risco calculado", description: `Score ${riskOne}/100. Analise automatica de apoio.`, user: "RiskEngine" }
    ]
  },
  {
    id: "case-002",
    organizationId: "org-demo",
    caseNumber: "AC-2026-002",
    infractionNumber: "AI-00512/2026",
    category: "Piso Minimo",
    subcategory: "Valor abaixo do piso",
    description: "Caso em tratamento. Tabela aplicavel deve ser confirmada por fonte oficial.",
    eventDate: "2026-07-28",
    receivedAt: "2026-07-30",
    amount: 10500,
    status: "IN_TREATMENT",
    riskScore: riskTwo,
    riskLevel: classifyRisk(riskTwo),
    vehiclePlate: "XYZ-9W01",
    authority: "ANTT",
    responsible: "Carlos Oliveira",
    deadlines: [{ id: "dl-2", type: "Recurso administrativo", dueDate: "2026-09-07", daysLeft: 9, status: "PENDING", basis: "NOT_VERIFIED" }],
    actions: [{ id: "ac-3", title: "Anexar comprovantes da operacao", priority: "MEDIUM", status: "PENDING", dueDate: "2026-08-30" }],
    documents: [],
    notes: [],
    decisions: [],
    aiExtractions: [],
    preventions: [],
    riskAssessment: null,
    timeline: [{ id: "ev-3", date: "30/07 14:00", title: "Prontuario criado", description: "Caso aberto para analise operacional.", user: "Carlos Oliveira" }]
  },
  {
    id: "case-003",
    organizationId: "org-demo",
    caseNumber: "AC-2026-003",
    category: "Documentacao",
    subcategory: "MDF-e irregular",
    description: "Aguardando decisao externa. Monitoramento sem conclusao juridica automatica.",
    eventDate: "2026-06-15",
    receivedAt: "2026-06-17",
    amount: 3200,
    status: "DECISION",
    riskScore: riskThree,
    riskLevel: classifyRisk(riskThree),
    vehiclePlate: "MNO-3E45",
    authority: "ANTT",
    responsible: "Ana Lima",
    deadlines: [{ id: "dl-3", type: "Monitorar decisao", dueDate: "2026-09-13", daysLeft: 15, status: "PENDING", basis: "NOT_VERIFIED" }],
    actions: [{ id: "ac-4", title: "Monitorar publicacao oficial", priority: "LOW", status: "IN_PROGRESS", dueDate: "2026-09-13" }],
    documents: [{ id: "doc-2", name: "defesa-demo.pdf", type: "DEFENSE", version: 1, storageKey: "demo/org-demo/case-003/defesa.pdf" }],
    notes: [],
    decisions: [],
    aiExtractions: [],
    preventions: [],
    riskAssessment: null,
    timeline: [{ id: "ev-4", date: "18/06 14:20", title: "Triagem", description: "Categoria Documentacao / MDF-e.", user: "Ana Lima" }]
  }
];

export const dashboard = {
  organizationName: "Transportadora Demo",
  regulatoryScore: 72,
  scoreComponents: { deadlines: 65, documentation: 70, ciot: 55, floorMinimum: 62, processes: 78, repetition: 68, prevention: 64 },
  scoreDisclaimer: "Indicador interno do sistema; nao representa certificacao oficial.",
  financialExposure: cases.filter((item) => item.status !== "CLOSED").reduce((sum, item) => sum + item.amount, 0),
  criticalCases: cases.filter((item) => item.riskLevel === "CRITICAL").length,
  activeCases: cases.filter((item) => item.status !== "CLOSED").length,
  closedCases: cases.filter((item) => item.status === "CLOSED").length,
  inTreatmentCases: cases.filter((item) => ["IN_TREATMENT", "ACTION_REQUIRED", "ANALYSIS", "TRIAGE"].includes(item.status)).length,
  upcomingDeadlines: cases.flatMap((item) => item.deadlines).filter((item) => item.status === "PENDING" && item.daysLeft <= 15).length,
  overdueDeadlines: cases.flatMap((item) => item.deadlines).filter((item) => item.status === "EXPIRED").length,
  trends: [{ month: "2026-08", cases: cases.length, amount: cases.reduce((sum, item) => sum + item.amount, 0) }],
  regulatoryChanges: [{ title: "Tema CIOT com possivel impacto", impact: "HIGH", detectedAt: "29/08" }]
};
