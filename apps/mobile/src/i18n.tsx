import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "pt" | "en";

const STORAGE_KEY = "safefleet-language";

const messages = {
  pt: {
    TODOS: "Todos",
    navCentral: "Central",
    navRecords: "Prontuarios",
    navNewFine: "Nova multa",
    navTasks: "Tarefas",
    navLegislation: "Legislacao",
    navRadar: "Radar",
    navIntelligence: "Inteligencia",
    navReports: "Relatorios",
    navAdmin: "Admin",
    navAlerts: "Alertas",
    navActions: "Acoes",
    navCases: "Casos",
    navDocument: "Documento",
    navDeadlines: "Prazos",
    organization: "Transportadora",
    brandSub: "multas e risco operacional",
    logout: "Sair",
    dashboardTitle: "Central Executiva",
    dashboardSubtitle: "Multas, prazos e risco operacional em poucos segundos",
    financialExposure: "Exposicao financeira",
    criticalCases: "Casos criticos",
    upcomingDeadlines: "Prazos proximos",
    activeCases: "Casos ativos",
    overdueDeadlines: "Prazos vencidos",
    closedCases: "Encerrados",
    overdueCount: "vencido(s)",
    upcomingCount: "proximos",
    activeCount: "ativos",
    photographAttach: "fotografar/anexar",
    maturityIndex: "Indice de maturidade regulatoria",
    internalIndicator: "Indicador interno do sistema; nao representa certificacao oficial.",
    deadlinesScore: "Prazos",
    documentationScore: "Documentacao",
    ciotScore: "Transporte",
    floorMinimumScore: "Financeiro",
    processesScore: "Processos",
    recurrenceScore: "Reincidencia",
    preventionScore: "Prevencao",
    operationalQueue: "Fila operacional",
    trends: "Tendencias",
    legislativeChanges: "Atualizacoes normativas",
    generated: "Gerado"
  },
  en: {
    TODOS: "All",
    navCentral: "Control",
    navRecords: "Records",
    navNewFine: "New fine",
    navTasks: "Tasks",
    navLegislation: "Legislation",
    navRadar: "Radar",
    navIntelligence: "Intelligence",
    navReports: "Reports",
    navAdmin: "Admin",
    navAlerts: "Alerts",
    navActions: "Actions",
    navCases: "Cases",
    navDocument: "Document",
    navDeadlines: "Deadlines",
    organization: "Carrier",
    brandSub: "fines and operational risk",
    logout: "Sign out",
    dashboardTitle: "Executive Control",
    dashboardSubtitle: "Fines, deadlines and operational risk in seconds",
    financialExposure: "Financial exposure",
    criticalCases: "Critical cases",
    upcomingDeadlines: "Upcoming deadlines",
    activeCases: "Active cases",
    overdueDeadlines: "Overdue deadlines",
    closedCases: "Closed",
    overdueCount: "overdue",
    upcomingCount: "upcoming",
    activeCount: "active",
    photographAttach: "photo/attach",
    maturityIndex: "Regulatory maturity index",
    internalIndicator: "Internal system indicator; not an official certification.",
    deadlinesScore: "Deadlines",
    documentationScore: "Documentation",
    ciotScore: "Transport",
    floorMinimumScore: "Financial",
    processesScore: "Processes",
    recurrenceScore: "Recurrence",
    preventionScore: "Prevention",
    operationalQueue: "Operational queue",
    trends: "Trends",
    legislativeChanges: "Regulatory updates",
    generated: "Generated"
  }
} as const;

export type MessageKey = keyof typeof messages.pt;

const codeLabels: Record<Language, Record<string, string>> = {
  pt: {
    LOW: "Baixo",
    MEDIUM: "Medio",
    HIGH: "Alto",
    CRITICAL: "Critico",
    RECEIVED: "Recebido",
    TRIAGE: "Triagem",
    ANALYSIS: "Analise",
    ACTION_REQUIRED: "Acao necessaria",
    IN_TREATMENT: "Em tratamento",
    WAITING_DOCUMENTS: "Aguardando docs",
    WAITING_EXTERNAL: "Aguardando externo",
    DECISION: "Decisao",
    APPEAL: "Recurso",
    FINALIZATION: "Finalizacao",
    CLOSED: "Encerrado",
    PENDING: "Pendente",
    IN_PROGRESS: "Em andamento",
    DONE: "Concluido",
    CANCELLED: "Cancelado",
    COMPLETED: "Concluido",
    EXPIRED: "Vencido",
    NOT_VERIFIED: "A validar",
    PENDING_CONFIRMATION: "A confirmar",
    CONFIRMED: "Confirmado",
    MONITORING: "Monitoramento",
    S3_KEY: "Arquivo",
    MONTH: "Mes",
    NEW: "Nova",
    READ: "Lida",
    ADMIN: "Administrador",
    OPERATOR: "Operador",
    LEGAL: "Juridico",
    MANAGER: "Gestor",
    VIEWER: "Leitura"
  },
  en: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
    RECEIVED: "Received",
    TRIAGE: "Triage",
    ANALYSIS: "Analysis",
    ACTION_REQUIRED: "Action required",
    IN_TREATMENT: "In treatment",
    WAITING_DOCUMENTS: "Waiting docs",
    WAITING_EXTERNAL: "Waiting external",
    DECISION: "Decision",
    APPEAL: "Appeal",
    FINALIZATION: "Finalization",
    CLOSED: "Closed",
    PENDING: "Pending",
    IN_PROGRESS: "In progress",
    DONE: "Done",
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
    EXPIRED: "Expired",
    NOT_VERIFIED: "To validate",
    PENDING_CONFIRMATION: "To confirm",
    CONFIRMED: "Confirmed",
    MONITORING: "Monitoring",
    S3_KEY: "File",
    MONTH: "Month",
    NEW: "New",
    READ: "Read",
    ADMIN: "Admin",
    OPERATOR: "Operator",
    LEGAL: "Legal",
    MANAGER: "Manager",
    VIEWER: "Viewer"
  }
};

export function codeLabel(code: string, language: Language) {
  return codeLabels[language][code] ?? code.replace(/_/g, " ").toLowerCase();
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey) => string;
  codeLabel: (code: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "pt" || stored === "en") setLanguageState(stored);
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    }
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (key) => messages[language][key],
    codeLabel: (code) => codeLabel(code, language)
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
