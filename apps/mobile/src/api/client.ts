import { cases, dashboard, type RegulatoryCase } from "../data/demo";

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

export async function getCase(id: string): Promise<RegulatoryCase | undefined> {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) return cases.find((item) => item.id === id);
  const response = await fetch(`${apiBaseUrl}/api/v1/case?id=${encodeURIComponent(id)}`);
  if (!response.ok) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;
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
