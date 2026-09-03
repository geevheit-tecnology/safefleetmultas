import { cases, dashboard, type RegulatoryCase } from "../data/demo";
import type { CaseStatus } from "../domain/workflow";

export type CaseAction = RegulatoryCase["actions"][number] & {
  caseId: string;
  caseNumber: string;
  responsible: string;
};

export type OperationalSummary = {
  myQueue: number;
  todayActions: number;
  highPriorityActions: number;
  criticalDeadlines: number;
  overdueDeadlines: number;
  pendingDocuments: number;
  waitingDecision: number;
  waitingDocuments: number;
};

export type NotificationSummary = {
  channels: string[];
  types: string[];
  deliveryNote: string;
  unreadCount: number;
  items: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    readAt: string;
    createdAt: string;
    channelPlan: Record<string, boolean>;
  }>;
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
  audit?: Array<{ action: string; entity: string; createdAt: string; userAgent: string }>;
  controls: {
    tenantIsolation: string;
    mutationAudit: string;
    deploymentProtection: string;
    productionAuth: string;
    privacy?: string;
  };
};

export type SaveUserInput = {
  name: string;
  email: string;
  role: string;
  password: string;
  mode?: "first_admin" | "create_user";
};

export type AuthUser = { id: string; name: string; email: string; role: string };

const authStorageKey = "safefleet-auth";

export type LegalDocumentSummary = {
  id: string;
  title: string;
  number?: string;
  year?: number;
  type?: string;
  status: string;
  effective: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  authority: string;
  source: string;
  sourceHash?: string;
  versions: number;
  currentVersion?: string;
};

export type RegulatoryChangeSummary = {
  id: string;
  title: string;
  detail: string;
  impact: "HIGH" | "MEDIUM" | "LOW" | "NOT_VERIFIED";
  legalDocument: string;
  detectedAt: string;
  source: string;
  topic?: string;
  relatedCases?: number;
  potentiallyAffected?: number;
  analysisNote?: string;
};

export type EffectiveRuleSummary = {
  occurrenceDate: string;
  topic: string;
  sourceRule: string;
  matches: Array<{
    id: string;
    title: string;
    status: string;
    authority: string;
    source: string;
    versionLabel: string;
    effectiveFrom: string;
    effectiveUntil: string;
    sourceHash: string;
    content: string;
  }>;
};

export type RelationshipSuggestionSummary = {
  caseId: string;
  message: string;
  validationRequired: boolean;
  suggestions: Array<{
    targetCaseId: string;
    targetCaseNumber: string;
    category: string;
    status: string;
    riskScore: number;
    riskLevel: string;
    relationshipType: "POSSIBLE_REPETITION" | "RELATED_CASE";
    reasons: string[];
    alreadyLinked: boolean;
    note: string;
  }>;
};

export type CreatePreventionInput = {
  caseId: string;
  causeCategory: "OPERATIONAL_FAILURE" | "DOCUMENT_FAILURE" | "PROCESS_FAILURE" | "HUMAN_FAILURE" | "SYSTEM_FAILURE" | "THIRD_PARTY" | "UNKNOWN";
  causeDescription: string;
  correctiveAction: string;
  preventionPlan: string;
};

export type IntelligenceSummary = {
  protected?: boolean;
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

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(authStorageKey);
    if (!stored) return null;
    return (JSON.parse(stored) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(authStorageKey);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const user = { id: "local-admin", name: "Admin Local", email, role: "ADMIN" };
    if (typeof window !== "undefined") window.localStorage.setItem(authStorageKey, JSON.stringify({ token: "local", user }));
    return user;
  }
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/security?auth=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Falha no login");
  }
  const payload = await response.json();
  if (typeof window !== "undefined") window.localStorage.setItem(authStorageKey, JSON.stringify(payload));
  return payload.user;
}

export async function logout(): Promise<void> {
  const apiBaseUrl = resolveApiBaseUrl();
  const token = getAuthToken();
  clearAuthSession();
  if (!apiBaseUrl || !token) return;
  await fetch(`${apiBaseUrl}/api/v1/admin/security?auth=logout`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

export async function listCases(): Promise<RegulatoryCase[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return cases;
  const response = await fetch(`${apiBaseUrl}/api/v1/cases`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar prontuarios");
  return response.json();
}

export async function getDashboard() {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return dashboard;
  const response = await fetch(`${apiBaseUrl}/api/v1/dashboard`, { headers: authHeaders() });
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

  const response = await fetch(`${apiBaseUrl}/api/v1/reports/summary`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar relatorio");
  return response.json();
}

export async function getSecuritySummary(): Promise<SecuritySummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      organization: { id: "local", name: "SafeFleet", document: "" },
      users: [],
      roles: [
        { id: "role-admin", code: "ADMIN", name: "Administrador", permissionCount: 13 },
        { id: "role-manager", code: "MANAGER", name: "Gestor", permissionCount: 7 },
        { id: "role-operator", code: "OPERATOR", name: "Operador", permissionCount: 5 },
        { id: "role-legal", code: "LEGAL", name: "Juridico", permissionCount: 8 },
        { id: "role-viewer", code: "VIEWER", name: "Leitura", permissionCount: 3 }
      ],
      permissions: [
        { role: "ADMIN", permission: "users.manage", description: "Gerenciar usuarios" },
        { role: "ADMIN", permission: "cases.close", description: "Excluir ou encerrar prontuarios" },
        { role: "OPERATOR", permission: "cases.update", description: "Atualizar prontuarios" }
      ],
      audit: [],
      controls: {
        tenantIsolation: "Ativo por empresa",
        mutationAudit: "Timeline auditavel",
        deploymentProtection: "Ambiente controlado",
        productionAuth: "Pendente"
      }
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/admin/security`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar seguranca");
  return response.json();
}

export async function saveUser(input: SaveUserInput): Promise<{ ok: boolean }> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return { ok: true };
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/security`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Falha ao salvar usuario");
  }
  return response.json();
}

export async function deleteUser(userId: string): Promise<{ ok: boolean }> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return { ok: true };
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/security?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!response.ok) {
    const payload = await safeJson(response);
    throw new Error(payload.message || "Falha ao excluir usuario");
  }
  return response.json();
}

async function safeJson(response: Response): Promise<{ message?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function listLegalDocuments(): Promise<LegalDocumentSummary[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return [
      { id: "law-1", title: "Regra operacional sobre documentos de transporte", status: "NOT_VERIFIED", effective: "vigencia a confirmar", authority: "ANTT", source: "Fonte oficial pendente", versions: 1 },
      { id: "law-2", title: "Obrigacoes fiscais de circulacao", status: "NOT_VERIFIED", effective: "vigencia a confirmar", authority: "SEFAZ", source: "Fonte oficial pendente", versions: 1 }
    ];
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/regulatory/library`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar legislacao");
  return response.json();
}

export async function listRegulatoryChanges(): Promise<RegulatoryChangeSummary[]> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return [
      { id: "change-1", title: "Atualizacao sobre documentos fiscais de transporte", impact: "HIGH", detail: "Pode impactar conferencias de embarque, documentos obrigatorios e defesa de autuacoes.", legalDocument: "Obrigacoes fiscais de circulacao", detectedAt: "29/08", source: "Monitoramento regulatorio" }
    ];
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/regulatory/radar`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar radar");
  return response.json();
}

export async function findEffectiveRule(occurrenceDate: string, topic = ""): Promise<EffectiveRuleSummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      occurrenceDate,
      topic,
      sourceRule: "Consulta deve respeitar a vigencia historica da norma aplicavel.",
      matches: [
        {
          id: "law-1",
          title: "Regra operacional sobre documentos de transporte",
          status: "NOT_VERIFIED",
          authority: "ANTT",
          source: "Fonte oficial pendente",
          versionLabel: "versao inicial",
          effectiveFrom: "2026-01-10",
          effectiveUntil: "",
          sourceHash: "fonte-pendente",
          content: "Conteudo sujeito a conferencia em fonte oficial antes de uso juridico."
        }
      ]
    };
  }

  const query = new URLSearchParams({ occurrenceDate });
  if (topic) query.set("topic", topic);
  const response = await fetch(`${apiBaseUrl}/api/v1/regulatory/effective-rule?${query.toString()}`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao consultar regra vigente");
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
        provider: "SafeFleet Intelligence",
        analysisType: "PREVENTIVE_INTELLIGENCE",
        content: "Possiveis padroes devem ser validados por responsavel humano.",
        sourceReference: "Base operacional da empresa."
      },
      analyses: []
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/intelligence`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar inteligencia");
  return response.json();
}

export async function getCase(id: string): Promise<RegulatoryCase | undefined> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return cases.find((item) => item.id === id);
  const response = await fetch(`${apiBaseUrl}/api/v1/case?id=${encodeURIComponent(id)}`, { headers: authHeaders() });
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "create_deadline", ...input })
  });
  if (!response.ok) throw new Error("Falha ao criar prazo");
  return response.json();
}

export type CreateActionInput = {
  caseId: string;
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
};

export async function createCaseAction(input: CreateActionInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      actions: [
        ...item.actions,
        {
          id: `local-action-${Date.now()}`,
          title: input.title,
          priority: input.priority,
          status: "PENDING",
          dueDate: input.dueDate,
          responsible: "Nao definido"
        }
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "create_action", ...input })
  });
  if (!response.ok) throw new Error("Falha ao criar acao");
  return response.json();
}

export async function confirmClosure(caseId: string): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      closureChecklist: {
        readyToClose: false,
        items: [
          { key: "responsibleConfirmed", label: "responsavel confirmou", done: true }
        ]
      }
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "confirm_closure", caseId })
  });
  if (!response.ok) throw new Error("Falha ao confirmar alta");
  return response.json();
}

export async function createPrevention(input: CreatePreventionInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      preventions: [
        {
          id: `local-prevention-${Date.now()}`,
          causeCategory: input.causeCategory,
          causeDescription: input.causeDescription,
          correctiveAction: input.correctiveAction,
          preventionPlan: input.preventionPlan,
          createdAt: new Date().toLocaleString("pt-BR")
        },
        ...item.preventions
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "create_prevention", ...input })
  });
  if (!response.ok) throw new Error("Falha ao registrar prevencao");
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    const stage = documentStage(input.type);
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
      ],
      actions: stage
        ? [
            {
              id: `local-action-${Date.now()}`,
              title: stage.actionTitle,
              priority: stage.priority,
              status: "PENDING",
              dueDate: "",
              completedAt: "",
              responsible: "Nao definido"
            },
            ...item.actions
          ]
        : item.actions,
      timeline: [
        ...item.timeline,
        {
          id: `local-event-${Date.now()}`,
          date: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          title: stage?.eventAction ?? "DOCUMENT_ATTACHED",
          description: stage ? `${stage.eventDescription}: "${input.name}".` : `Documento "${input.name}" anexado ao prontuario.`,
          user: "Sistema"
        }
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "attach_document", ...input })
  });
  if (!response.ok) throw new Error("Falha ao anexar documento");
  return response.json();
}

function documentStage(type: string): { eventAction: string; eventDescription: string; actionTitle: string; priority: "HIGH" | "MEDIUM" | "LOW" } | null {
  const stages: Record<string, { eventAction: string; eventDescription: string; actionTitle: string; priority: "HIGH" | "MEDIUM" | "LOW" }> = {
    PROTOCOLO_DEFESA: {
      eventAction: "DEFENSE_PROTOCOL_ATTACHED",
      eventDescription: "Protocolo de defesa anexado ao prontuario",
      actionTitle: "Acompanhar resposta do protocolo de defesa",
      priority: "HIGH"
    },
    DEFESA: {
      eventAction: "DEFENSE_ATTACHED",
      eventDescription: "Defesa anexada ao prontuario",
      actionTitle: "Monitorar julgamento da defesa",
      priority: "HIGH"
    },
    RECURSO: {
      eventAction: "APPEAL_ATTACHED",
      eventDescription: "Recurso anexado ao prontuario",
      actionTitle: "Monitorar julgamento do recurso",
      priority: "HIGH"
    },
    DECISAO: {
      eventAction: "DECISION_DOCUMENT_ATTACHED",
      eventDescription: "Documento de decisao anexado ao prontuario",
      actionTitle: "Atualizar valor final e checklist de alta",
      priority: "MEDIUM"
    },
    COMPROVANTE: {
      eventAction: "PROOF_ATTACHED",
      eventDescription: "Comprovante anexado ao prontuario",
      actionTitle: "Conferir baixa operacional do comprovante",
      priority: "MEDIUM"
    }
  };
  return stages[type] ?? null;
}

export type SmartTriageInput = {
  caseId: string;
  documentId?: string;
  documentName?: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  notes: string[];
};

export async function runSmartTriage(input: SmartTriageInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.caseId);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      status: item.status === "RECEIVED" ? "TRIAGE" : item.status,
      aiExtractions: [
        {
          id: `local-triage-${Date.now()}`,
          provider: "SafeFleet Scanner",
          status: "PENDING_CONFIRMATION",
          documentName: input.documentName ?? "documento",
          extractedData: {
            ...input.extractedData,
            confidence: input.confidence,
            notes: input.notes
          }
        },
        ...item.aiExtractions
      ],
      timeline: [
        ...item.timeline,
        {
          id: `local-triage-event-${Date.now()}`,
          date: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          title: "TRIAGE_CREATED",
          description: `Triagem inteligente criada com ${input.confidence}% de confianca. Revisao humana obrigatoria.`,
          user: "SafeFleet Scanner"
        }
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "smart_triage", ...input })
  });
  if (!response.ok) throw new Error("Falha ao executar triagem inteligente");
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
          provider: "SafeFleet OCR",
          status: "PENDING_CONFIRMATION",
          documentName: document?.name ?? "documento",
          extractedData: { infractionNumber: item.infractionNumber, category: item.category, warning: "Confirmacao humana obrigatoria" }
        },
        ...item.aiExtractions
      ]
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "confirm_extraction", caseId, extractionId })
  });
  if (!response.ok) throw new Error("Falha ao confirmar OCR");
  return response.json();
}

export async function suggestRelationships(caseId: string): Promise<RelationshipSuggestionSummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      caseId,
      message: "Foram encontradas 0 ocorrencias semelhantes.",
      validationRequired: true,
      suggestions: []
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "suggest_relationships", caseId })
  });
  if (!response.ok) throw new Error("Falha ao sugerir relacoes");
  return response.json();
}

export async function validateRelationship(input: {
  sourceCaseId: string;
  targetCaseId: string;
  relationshipType: "POSSIBLE_REPETITION" | "RELATED_CASE";
}): Promise<{ id: string; relationshipType: string; validatedAt: string }> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return { id: `local-relationship-${Date.now()}`, relationshipType: input.relationshipType, validatedAt: new Date().toISOString() };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/case`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ action: "validate_relationship", ...input })
  });
  if (!response.ok) throw new Error("Falha ao validar relacao");
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

  const response = await fetch(`${apiBaseUrl}/api/v1/tasks`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar tarefas");
  return response.json();
}

export async function getOperationalSummary(): Promise<OperationalSummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const openActions = cases.flatMap((item) => item.actions).filter((item) => item.status === "PENDING" || item.status === "IN_PROGRESS");
    return {
      myQueue: openActions.length,
      todayActions: 0,
      highPriorityActions: openActions.filter((item) => item.priority === "HIGH").length,
      criticalDeadlines: cases.flatMap((item) => item.deadlines).filter((item) => item.status === "PENDING" && item.daysLeft <= 3).length,
      overdueDeadlines: cases.flatMap((item) => item.deadlines).filter((item) => item.status === "EXPIRED").length,
      pendingDocuments: cases.filter((item) => item.documents.length === 0).length,
      waitingDecision: cases.filter((item) => item.status === "DECISION").length,
      waitingDocuments: cases.filter((item) => item.status === "WAITING_DOCUMENTS").length
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/tasks?summary=1`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar dashboard operacional");
  return response.json();
}

export async function listNotifications(): Promise<NotificationSummary> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      channels: ["in_app", "email", "push", "whatsapp"],
      types: ["DEADLINE_APPROACHING", "DEADLINE_EXPIRED", "NEW_CASE", "RISK_CHANGED", "DOCUMENT_REQUIRED", "LEGAL_CHANGE", "IMPACT_DETECTED", "ACTION_REQUIRED"],
      deliveryNote: "Envios externos dependem dos canais habilitados pela empresa.",
      unreadCount: 0,
      items: []
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/tasks?notifications=1`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Falha ao carregar notificacoes");
  return response.json();
}

export async function updateTaskStatus(id: string, status: "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED"): Promise<CaseAction> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const task = await listTasks().then((items) => items.find((item) => item.id === id));
    if (!task) throw new Error("Tarefa nao encontrada");
    return { ...task, status };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/tasks`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
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
  authority?: string;
};

export async function createCase(input: CreateCaseInput): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const now = new Date().toISOString().slice(0, 10);
    return {
      id: `local-${Date.now()}`,
      organizationId: "local",
      caseNumber: `SF-${Date.now()}`,
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
      authority: input.authority || "Orgao informado",
      responsible: "Nao definido",
      deadlines: [],
      actions: [],
      documents: [],
      notes: [],
      decisions: [],
      aiExtractions: [],
      preventions: [],
      timeline: []
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Falha ao criar prontuario");
  return response.json();
}

export async function updateCase(input: CreateCaseInput & { id: string }): Promise<RegulatoryCase> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    const item = cases.find((caseItem) => caseItem.id === input.id);
    if (!item) throw new Error("Prontuario nao encontrado");
    return {
      ...item,
      infractionNumber: input.infractionNumber,
      category: input.category,
      subcategory: input.subcategory,
      description: input.description,
      vehiclePlate: input.vehiclePlate,
      rntrc: input.rntrc,
      amount: input.amount,
      authority: input.authority || item.authority
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/cases`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Falha ao editar prontuario");
  return response.json();
}

export async function deleteCase(id: string): Promise<{ ok: boolean }> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return { ok: true };
  const response = await fetch(`${apiBaseUrl}/api/v1/cases?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders()
  });
  if (!response.ok) throw new Error("Falha ao excluir prontuario");
  return response.json();
}
