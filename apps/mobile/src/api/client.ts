import { cases, dashboard, type RegulatoryCase } from "../data/demo";
import type { CaseStatus } from "../domain/workflow";

export type CaseAction = RegulatoryCase["actions"][number] & {
  caseId: string;
  caseNumber: string;
  responsible: string;
};

export type ReportSummary = {
  organizationName: string;
  generatedAt: string;
  overview: {
    totalCases: number;
    activeCases: number;
    closedCases: number;
    criticalCases: number;
    financialExposure: number;
    averageRiskScore: number;
  };
  byStatus: Array<{ label: string; count: number; amount: number }>;
  byRisk: Array<{ label: string; count: number; amount: number }>;
  byCategory: Array<{ label: string; count: number; amount: number }>;
  deadlines: { pending: number; overdue: number; upcoming: number };
  recentEvents: Array<{ id: string; caseNumber: string; action: string; description: string; date: string }>;
};

export type SecuritySummary = {
  organization: { id: string; name: string; document: string } | null;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  userCount?: number;
  roles: Array<{ id?: string; code: string; name: string; permissionCount: number }>;
  permissions: Array<{ role: string; permission: string; description: string }>;
  controls: {
    tenantIsolation: string;
    mutationAudit: string;
    deploymentProtection: string;
    productionAuth: string;
  };
};

export type LegalDocumentSummary = {
  id: string;
  title: string;
  status: string;
  effective: string;
  authority: string;
  source: string;
  versions: number;
};

export type RegulatoryChangeSummary = {
  id: string;
  title: string;
  detail: string;
  impact: "HIGH" | "MEDIUM" | "LOW" | "NOT_VERIFIED";
  legalDocument: string;
  detectedAt: string;
  source: string;
};

export type IntelligenceSummary = {
  metrics: { totalCases: number; ciotCases: number; highRiskCases: number; averageRiskScore: number };
  preventive: { provider: string; analysisType: string; content: string; sourceReference: string };
  analyses: Array<{ id: string; caseNumber: string; provider: string; analysisType: string; content: string; sourceReference: string; createdAt: string }>;
};

const configuredApiBaseUrl =
  typeof globalThis !== "undefined" && "process" in globalThis
    ? (globalThis.process as { env?: { EXPO_PUBLIC_API_BASE_URL?: string } }).env?.EXPO_PUBLIC_API_BASE_URL
    : undefined;

function resolveApiBaseUrl(): string | undefined {
  if (configuredApiBaseUrl) return configuredApiBaseUrl;
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return undefined;
  return "";
}

export async function listCases(): Promise<RegulatoryCase[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return cases;
  const response = await fetch(`${apiBaseUrl}/api/v1/cases`);
  if (!response.ok) throw new Error("Falha ao carregar prontuarios");
  return response.json();
}

export async function getDashboard() {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return dashboard;
  const response = await fetch(`${apiBaseUrl}/api/v1/dashboard`);
  if (!response.ok) throw new Error("Falha ao carregar dashboard");
  return response.json();
}

export async function getReportSummary(): Promise<ReportSummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      organizationName: dashboard.organizationName,
      generatedAt: new Date().toISOString(),
      overview: {
        totalCases: cases.length,
        activeCases: dashboard.activeCases,
        closedCases: cases.filter((item) => item.status === "CLOSED").length,
        criticalCases: dashboard.criticalCases,
        financialExposure: dashboard.financialExposure,
        averageRiskScore: cases.reduce((sum, item) => sum + item.riskScore, 0) / cases.length
      },
      byStatus: Object.entries(
        cases.reduce<Record<string, { label: string; count: number; amount: number }>>((acc, item) => {
          acc[item.status] = acc[item.status] ?? { label: item.status, count: 0, amount: 0 };
          acc[item.status].count += 1;
          acc[item.status].amount += item.amount;
          return acc;
        }, {})
      ).map(([, item]) => item),
      byRisk: Object.entries(
        cases.reduce<Record<string, { label: string; count: number; amount: number }>>((acc, item) => {
          acc[item.riskLevel] = acc[item.riskLevel] ?? { label: item.riskLevel, count: 0, amount: 0 };
          acc[item.riskLevel].count += 1;
          acc[item.riskLevel].amount += item.amount;
          return acc;
        }, {})
      ).map(([, item]) => item),
      byCategory: Object.entries(
        cases.reduce<Record<string, { label: string; count: number; amount: number }>>((acc, item) => {
          acc[item.category] = acc[item.category] ?? { label: item.category, count: 0, amount: 0 };
          acc[item.category].count += 1;
          acc[item.category].amount += item.amount;
          return acc;
        }, {})
      ).map(([, item]) => item),
      deadlines: {
        pending: cases.flatMap((item) => item.deadlines).filter((item) => item.status === "PENDING").length,
        overdue: 0,
        upcoming: dashboard.upcomingDeadlines
      },
      recentEvents: cases.flatMap((item) => item.timeline.map((event) => ({ ...event, action: event.title, caseNumber: item.caseNumber }))).slice(0, 8)
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/reports/summary`);
  if (!response.ok) throw new Error("Falha ao carregar relatorio");
  return response.json();
}

export async function getSecuritySummary(): Promise<SecuritySummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      organization: { id: "org-demo", name: "Transportadora Demo", document: "" },
      users: [
        { id: "user-1", name: "Ana Lima", email: "ana@demo.com.br", role: "OPERATOR" },
        { id: "user-2", name: "Carlos Oliveira", email: "carlos@demo.com.br", role: "LEGAL" }
      ],
      roles: [
        { id: "role-1", code: "ADMIN", name: "Administrador", permissionCount: 4 },
        { id: "role-2", code: "OPERATOR", name: "Operador", permissionCount: 3 }
      ],
      permissions: [
        { role: "ADMIN", permission: "users.manage", description: "Gerenciar usuarios" },
        { role: "OPERATOR", permission: "cases.manage", description: "Gerenciar prontuarios" }
      ],
      controls: {
        tenantIsolation: "Demo local",
        mutationAudit: "Timeline demo",
        deploymentProtection: "Preview local",
        productionAuth: "Pendente"
      }
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/admin/security`);
  if (!response.ok) throw new Error("Falha ao carregar seguranca");
  return response.json();
}

export async function listLegalDocuments(): Promise<LegalDocumentSummary[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return [
      { id: "law-1", title: "Resolucao ANTT sobre CIOT", status: "NOT_VERIFIED", effective: "vigencia a confirmar", authority: "ANTT", source: "Fonte oficial pendente", versions: 1 },
      { id: "law-2", title: "Lei do Piso Minimo", status: "NOT_VERIFIED", effective: "vigencia a confirmar", authority: "Governo Federal", source: "Fonte oficial pendente", versions: 1 }
    ];
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/regulatory/library`);
  if (!response.ok) throw new Error("Falha ao carregar legislacao");
  return response.json();
}

export async function listRegulatoryChanges(): Promise<RegulatoryChangeSummary[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return [
      { id: "change-1", title: "Tema CIOT com possivel impacto", impact: "HIGH", detail: "Entrada demo. Precisa de conferencia oficial.", legalDocument: "Resolucao ANTT sobre CIOT", detectedAt: "demo", source: "" }
    ];
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/regulatory/radar`);
  if (!response.ok) throw new Error("Falha ao carregar radar");
  return response.json();
}

export async function getIntelligenceSummary(): Promise<IntelligenceSummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      metrics: {
        totalCases: cases.length,
        ciotCases: cases.filter((item) => item.category.includes("CIOT")).length,
        highRiskCases: cases.filter((item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL").length,
        averageRiskScore: cases.reduce((sum, item) => sum + item.riskScore, 0) / cases.length
      },
      preventive: {
        provider: "MOCK_AI_PROVIDER",
        analysisType: "PREVENTIVE_INTELLIGENCE",
        content: "Possiveis padroes devem ser validados por responsavel humano.",
        sourceReference: "Dados demo locais."
      },
      analyses: []
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/intelligence`);
  if (!response.ok) throw new Error("Falha ao carregar inteligencia");
  return response.json();
}

export async function getCase(id: string): Promise<RegulatoryCase | undefined> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return cases.find((item) => item.id === id);
  const response = await fetch(`${apiBaseUrl}/api/v1/case?id=${encodeURIComponent(id)}`);
  if (!response.ok) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;
  return response.json();
}

export async function updateCaseStatus(id: string, status: CaseStatus, reason: string): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === id);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      status,
      timeline: [
        ...item.timeline,
        {
          id: `local-event-${Date.now()}`,
          date: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          title: "STATUS_CHANGED",
          description: reason || `Status alterado para ${status}.`,
          user: "Sistema"
        }
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, reason })
  });
  if (!response.ok) throw new Error("Falha ao atualizar status");
  return response.json();
}

export type CreateDeadlineInput = {
  caseId: string;
  type: string;
  dueDate: string;
  basis: string;
};

export async function createDeadline(input: CreateDeadlineInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      deadlines: [
        ...item.deadlines,
        {
          id: `local-deadline-${Date.now()}`,
          type: input.type,
          dueDate: input.dueDate,
          basis: input.basis || "NOT_VERIFIED",
          status: "PENDING",
          daysLeft: 0
        }
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_deadline", ...input })
  });
  if (!response.ok) throw new Error("Falha ao criar prazo");
  return response.json();
}

export async function completeDeadline(caseId: string, deadlineId: string): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      deadlines: item.deadlines.map((deadline) => (deadline.id === deadlineId ? { ...deadline, status: "COMPLETED" } : deadline))
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete_deadline", caseId, deadlineId })
  });
  if (!response.ok) throw new Error("Falha ao concluir prazo");
  return response.json();
}

export type AttachDocumentInput = {
  caseId: string;
  name: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageKey: string;
};

export async function attachDocument(input: AttachDocumentInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      documents: [
        {
          id: `local-document-${Date.now()}`,
          name: input.name,
          type: input.type,
          version: 1,
          storageKey: input.storageKey
        },
        ...item.documents
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "attach_document", ...input })
  });
  if (!response.ok) throw new Error("Falha ao anexar documento");
  return response.json();
}

export async function addNote(caseId: string, body: string): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      notes: [
        {
          id: `local-note-${Date.now()}`,
          body,
          author: "Sistema",
          createdAt: new Date().toLocaleString("pt-BR")
        },
        ...item.notes
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add_note", caseId, body })
  });
  if (!response.ok) throw new Error("Falha ao registrar nota");
  return response.json();
}

export type RegisterDecisionInput = {
  caseId: string;
  type: string;
  date: string;
  finalAmount: number;
  notes: string;
};

export async function registerDecision(input: RegisterDecisionInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      amount: input.finalAmount || item.amount,
      decisions: [
        {
          id: `local-decision-${Date.now()}`,
          type: input.type,
          date: input.date,
          finalAmount: input.finalAmount,
          notes: input.notes
        },
        ...item.decisions
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "register_decision", ...input })
  });
  if (!response.ok) throw new Error("Falha ao registrar decisao");
  return response.json();
}

export async function prepareDocumentExtraction(caseId: string, documentId: string): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    const document = item.documents.find((doc) => doc.id === documentId);
    return {
      ...item,
      aiExtractions: [
        {
          id: `local-extraction-${Date.now()}`,
          provider: "MOCK_OCR",
          status: "PENDING_CONFIRMATION",
          documentName: document?.name ?? "documento",
          extractedData: { infractionNumber: item.infractionNumber, category: item.category, warning: "Demo local exige confirmacao humana" }
        },
        ...item.aiExtractions
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "prepare_extraction", caseId, documentId })
  });
  if (!response.ok) throw new Error("Falha ao preparar OCR");
  return response.json();
}

export async function confirmDocumentExtraction(caseId: string, extractionId: string): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      aiExtractions: item.aiExtractions.map((extraction) =>
        extraction.id === extractionId ? { ...extraction, status: "CONFIRMED", confirmedAt: new Date().toISOString() } : extraction
      )
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm_extraction", caseId, extractionId })
  });
  if (!response.ok) throw new Error("Falha ao confirmar OCR");
  return response.json();
}


export async function listTasks(): Promise<CaseAction[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return cases.flatMap((item) =>
      item.actions.map((action) => ({
        ...action,
        caseId: item.id,
        caseNumber: item.caseNumber,
        responsible: item.responsible
      }))
    );
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/tasks`);
  if (!response.ok) throw new Error("Falha ao carregar tarefas");
  return response.json();
}

export async function updateTaskStatus(id: string, status: "PENDING" | "IN_PROGRESS" | "DONE"): Promise<CaseAction> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const task = await listTasks().then((items) => items.find((item) => item.id === id));
    if (!task) throw new Error("Tarefa nao encontrada");
    return { ...task, status };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/tasks`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status })
  });
  if (!response.ok) throw new Error("Falha ao atualizar tarefa");
  return response.json();
}

export type CreateCaseInput = {
  infractionNumber: string;
  category: string;
  subcategory: string;
  description: string;
  vehiclePlate: string;
  rntrc: string;
  amount: number;
};

export async function createCase(input: CreateCaseInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const now = new Date().toISOString().slice(0, 10);
    return {
      id: `local-${Date.now()}`,
      organizationId: "org-demo",
      caseNumber: `LOCAL-${Date.now()}`,
      infractionNumber: input.infractionNumber,
      category: input.category,
      subcategory: input.subcategory,
      description: input.description,
      eventDate: now,
      receivedAt: now,
      amount: input.amount,
      status: "RECEIVED",
      riskScore: 0,
      riskLevel: "LOW",
      vehiclePlate: input.vehiclePlate,
      rntrc: input.rntrc,
      authority: "ANTT",
      responsible: "Nao definido",
      deadlines: [],
      actions: [],
      documents: [],
      notes: [],
      decisions: [],
      aiExtractions: [],
      timeline: []
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Falha ao criar prontuario");
  return response.json();
}
