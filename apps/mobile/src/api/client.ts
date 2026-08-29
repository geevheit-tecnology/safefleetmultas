import { cases, dashboard, type RegulatoryCase } from "../data/demo";

const apiBaseUrl =
  typeof globalThis !== "undefined" && "process" in globalThis
    ? (globalThis.process as { env?: { EXPO_PUBLIC_API_BASE_URL?: string } }).env?.EXPO_PUBLIC_API_BASE_URL
    : undefined;

export async function listCases(): Promise<RegulatoryCase[]> {
  if (!apiBaseUrl) return cases;
  const response = await fetch(`${apiBaseUrl}/api/v1/cases`);
  if (!response.ok) throw new Error("Falha ao carregar prontuarios");
  return response.json();
}

export async function getDashboard() {
  if (!apiBaseUrl) return dashboard;
  const response = await fetch(`${apiBaseUrl}/api/v1/dashboard`);
  if (!response.ok) throw new Error("Falha ao carregar dashboard");
  return response.json();
}

export async function getCase(id: string): Promise<RegulatoryCase | undefined> {
  if (!apiBaseUrl) return cases.find((item) => item.id === id);
  const response = await fetch(`${apiBaseUrl}/api/v1/cases/${id}`);
  if (!response.ok) return undefined;
  return response.json();
}
