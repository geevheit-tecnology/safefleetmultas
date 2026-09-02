import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getReportSummary, listCases, type ReportSummary } from "../src/api/client";
import type { RegulatoryCase } from "../src/data/demo";
import { useLanguage } from "../src/i18n";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type ReportFilters = {
  search: string;
  status: string;
  risk: string;
  authority: string;
  category: string;
  startDate: string;
  endDate: string;
};

const initialFilters: ReportFilters = {
  search: "",
  status: "TODOS",
  risk: "TODOS",
  authority: "",
  category: "",
  startDate: "",
  endDate: ""
};

export default function ReportsScreen() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [items, setItems] = useState<RegulatoryCase[]>([]);
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [error, setError] = useState<string | null>(null);
  const { codeLabel } = useLanguage();

  useEffect(() => {
    void Promise.all([getReportSummary(), listCases()])
      .then(([summary, caseItems]) => {
        setReport(summary);
        setItems(caseItems);
      })
      .catch(() => setError("Nao foi possivel carregar os relatorios."));
  }, []);

  const filteredItems = useMemo(() => applyFilters(items, filters), [items, filters]);
  const filteredAmount = filteredItems.reduce((sum, item) => sum + item.amount, 0);
  const averageRisk = filteredItems.length ? filteredItems.reduce((sum, item) => sum + item.riskScore, 0) / filteredItems.length : 0;

  return (
    <AppShell title="Relatorios" subtitle="PDF, Excel e filtros por multa">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!report ? <Text style={styles.body}>Carregando relatorio...</Text> : null}
      {report ? (
        <>
          <View style={styles.metrics}>
            <InfoCard label="Multas filtradas" value={String(filteredItems.length)} />
            <InfoCard label="Exposicao filtrada" value={money.format(filteredAmount)} tone="#b42318" />
            <InfoCard label="Risco medio" value={`${Math.round(averageRisk)}/100`} tone="#b76e00" />
            <InfoCard label="Criticas" value={String(filteredItems.filter((item) => item.riskLevel === "CRITICAL").length)} tone="#b42318" />
          </View>

          <Panel title="Filtros">
            <View style={styles.filters}>
              <TextInput value={filters.search} onChangeText={(value) => updateFilter(setFilters, "search", value)} style={[styles.input, styles.searchInput]} placeholder="Buscar por multa, auto, placa, orgao, categoria ou responsavel" placeholderTextColor="#98a2b3" />
              <TextInput value={filters.category} onChangeText={(value) => updateFilter(setFilters, "category", value)} style={styles.input} placeholder="Categoria" placeholderTextColor="#98a2b3" />
              <TextInput value={filters.authority} onChangeText={(value) => updateFilter(setFilters, "authority", value)} style={styles.input} placeholder="Orgao" placeholderTextColor="#98a2b3" />
              <TextInput value={filters.startDate} onChangeText={(value) => updateFilter(setFilters, "startDate", value)} style={styles.dateInput} placeholder="Data inicial" placeholderTextColor="#98a2b3" />
              <TextInput value={filters.endDate} onChangeText={(value) => updateFilter(setFilters, "endDate", value)} style={styles.dateInput} placeholder="Data final" placeholderTextColor="#98a2b3" />
            </View>
            <View style={styles.segment}>
              {["TODOS", "RECEIVED", "TRIAGE", "ACTION_REQUIRED", "IN_TREATMENT", "DECISION", "CLOSED"].map((status) => (
                <FilterButton key={status} label={status === "TODOS" ? "Todos" : codeLabel(status)} active={filters.status === status} onPress={() => updateFilter(setFilters, "status", status)} />
              ))}
            </View>
            <View style={styles.segment}>
              {["TODOS", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((risk) => (
                <FilterButton key={risk} label={risk === "TODOS" ? "Todos riscos" : codeLabel(risk)} active={filters.risk === risk} onPress={() => updateFilter(setFilters, "risk", risk)} />
              ))}
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => setFilters(initialFilters)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Limpar filtros</Text>
              </Pressable>
              <Pressable onPress={() => exportCsv(filteredItems)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Exportar Excel</Text>
              </Pressable>
              <Pressable onPress={() => printPdf(filteredItems, report, codeLabel)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Gerar PDF</Text>
              </Pressable>
            </View>
          </Panel>

          <View style={styles.columns}>
            <BreakdownPanel title="Por status" rows={groupBy(filteredItems, "status")} formatLabel={codeLabel} />
            <BreakdownPanel title="Por risco" rows={groupBy(filteredItems, "riskLevel")} formatLabel={codeLabel} />
            <BreakdownPanel title="Por categoria" rows={groupBy(filteredItems, "category")} />
          </View>

          <Panel title="Multas filtradas">
            {filteredItems.length === 0 ? <Text style={styles.body}>Nenhuma multa encontrada com os filtros atuais.</Text> : null}
            {filteredItems.map((item) => (
              <View key={item.id} style={styles.caseRow}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.caseNumber} · {item.infractionNumber || "auto nao informado"}</Text>
                  <Text style={styles.body}>{item.category} · {item.subcategory || "sem subcategoria"} · {item.vehiclePlate || "placa nao informada"}</Text>
                  <Text style={styles.muted}>{codeLabel(item.status)} · {item.authority} · {item.responsible} · recebido {item.receivedAt || "sem data"}</Text>
                </View>
                <View style={styles.caseActions}>
                  <Pill text={`${codeLabel(item.riskLevel)} ${item.riskScore}/100`} tone={item.riskLevel === "CRITICAL" || item.riskLevel === "HIGH" ? "#b42318" : "#5c7fa8"} />
                  <Text style={styles.amount}>{money.format(item.amount)}</Text>
                  <Pressable onPress={() => printCasePdf(item, codeLabel)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                    <Text style={styles.secondaryButtonText}>PDF da multa</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </Panel>

          <Panel title="Eventos recentes">
            {report.recentEvents.length === 0 ? <Text style={styles.body}>Nenhum evento registrado.</Text> : null}
            {report.recentEvents.map((event) => (
              <View key={event.id} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{event.caseNumber} · {event.action}</Text>
                  <Text style={styles.body}>{event.description}</Text>
                </View>
                <Text style={styles.muted}>{event.date}</Text>
              </View>
            ))}
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}

function updateFilter(setFilters: (updater: (current: ReportFilters) => ReportFilters) => void, key: keyof ReportFilters, value: string) {
  setFilters((current) => ({ ...current, [key]: value }));
}

function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterButton, active && styles.filterButtonActive, pressed && styles.pressed]}>
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function applyFilters(items: RegulatoryCase[], filters: ReportFilters) {
  const search = normalize(filters.search);
  return items.filter((item) => {
    const searchable = normalize([item.caseNumber, item.infractionNumber, item.vehiclePlate, item.authority, item.category, item.subcategory, item.responsible].filter(Boolean).join(" "));
    if (search && !searchable.includes(search)) return false;
    if (filters.status !== "TODOS" && item.status !== filters.status) return false;
    if (filters.risk !== "TODOS" && item.riskLevel !== filters.risk) return false;
    if (filters.authority.trim() && !normalize(item.authority).includes(normalize(filters.authority))) return false;
    if (filters.category.trim() && !normalize(item.category).includes(normalize(filters.category))) return false;
    if (filters.startDate && item.receivedAt && item.receivedAt < filters.startDate) return false;
    if (filters.endDate && item.receivedAt && item.receivedAt > filters.endDate) return false;
    return true;
  });
}

function groupBy(items: RegulatoryCase[], key: "status" | "riskLevel" | "category") {
  const grouped = items.reduce<Record<string, { label: string; count: number; amount: number }>>((acc, item) => {
    const label = String(item[key] || "Nao informado");
    acc[label] = acc[label] ?? { label, count: 0, amount: 0 };
    acc[label].count += 1;
    acc[label].amount += item.amount;
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
}

function BreakdownPanel({ title, rows, formatLabel = (label: string) => label }: { title: string; rows: Array<{ label: string; count: number; amount: number }>; formatLabel?: (label: string) => string }) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? <Text style={styles.body}>Sem dados.</Text> : null}
      {rows.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{formatLabel(item.label)}</Text>
            <Text style={styles.muted}>{item.count} multa(s)</Text>
          </View>
          <Text style={styles.amount}>{money.format(item.amount)}</Text>
        </View>
      ))}
    </Panel>
  );
}

function exportCsv(items: RegulatoryCase[]) {
  const rows = [
    ["Prontuario", "Auto", "Status", "Risco", "Score", "Categoria", "Subcategoria", "Placa", "Orgao", "Responsavel", "Recebido", "Valor"],
    ...items.map((item) => [
      item.caseNumber,
      item.infractionNumber || "",
      item.status,
      item.riskLevel,
      String(item.riskScore),
      item.category,
      item.subcategory || "",
      item.vehiclePlate || "",
      item.authority,
      item.responsible,
      item.receivedAt || "",
      String(item.amount)
    ])
  ];
  downloadFile(`safefleet-relatorio-${today()}.csv`, rows.map((row) => row.map(csvCell).join(";")).join("\n"), "text/csv;charset=utf-8");
}

function printPdf(items: RegulatoryCase[], report: ReportSummary, codeLabel: (code: string) => string) {
  const body = `
    <h1>SafeFleet - Relatorio de Multas</h1>
    <p>${escapeHtml(report.organizationName)} · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    <div class="metrics">
      <strong>${items.length}</strong> multas filtradas ·
      <strong>${money.format(items.reduce((sum, item) => sum + item.amount, 0))}</strong> em exposicao
    </div>
    <table>
      <thead><tr><th>Prontuario</th><th>Auto</th><th>Status</th><th>Risco</th><th>Placa</th><th>Orgao</th><th>Valor</th></tr></thead>
      <tbody>${items.map((item) => `<tr><td>${escapeHtml(item.caseNumber)}</td><td>${escapeHtml(item.infractionNumber || "")}</td><td>${escapeHtml(codeLabel(item.status))}</td><td>${escapeHtml(codeLabel(item.riskLevel))} ${item.riskScore}/100</td><td>${escapeHtml(item.vehiclePlate || "")}</td><td>${escapeHtml(item.authority)}</td><td>${money.format(item.amount)}</td></tr>`).join("")}</tbody>
    </table>
  `;
  openPrintWindow(body);
}

function printCasePdf(item: RegulatoryCase, codeLabel: (code: string) => string) {
  const body = `
    <h1>SafeFleet - Relatorio da Multa</h1>
    <section><h2>${escapeHtml(item.caseNumber)}</h2><p>${escapeHtml(item.description || "")}</p></section>
    <table>
      <tbody>
        <tr><th>Auto</th><td>${escapeHtml(item.infractionNumber || "Nao informado")}</td></tr>
        <tr><th>Status</th><td>${escapeHtml(codeLabel(item.status))}</td></tr>
        <tr><th>Risco</th><td>${escapeHtml(codeLabel(item.riskLevel))} ${item.riskScore}/100</td></tr>
        <tr><th>Categoria</th><td>${escapeHtml(item.category)} / ${escapeHtml(item.subcategory || "")}</td></tr>
        <tr><th>Placa</th><td>${escapeHtml(item.vehiclePlate || "Nao informada")}</td></tr>
        <tr><th>Orgao</th><td>${escapeHtml(item.authority)}</td></tr>
        <tr><th>Valor</th><td>${money.format(item.amount)}</td></tr>
      </tbody>
    </table>
    <h2>Prazos</h2>${listHtml(item.deadlines.map((deadline) => `${deadline.type} - ${deadline.dueDate} - ${codeLabel(deadline.status)}`))}
    <h2>Acoes</h2>${listHtml(item.actions.map((action) => `${action.title} - ${codeLabel(action.priority)} - ${codeLabel(action.status)}`))}
    <h2>Documentos</h2>${listHtml(item.documents.map((doc) => `${doc.name} - ${doc.type}`))}
    <h2>Timeline</h2>${listHtml(item.timeline.map((event) => `${event.date} - ${event.title}: ${event.description}`))}
  `;
  openPrintWindow(body);
}

function openPrintWindow(body: string) {
  if (typeof window === "undefined") return;
  const target = window.open("", "_blank", "width=980,height=720");
  if (!target) return;
  target.document.write(`<!doctype html><html><head><title>SafeFleet Relatorio</title><style>
    body{font-family:Arial,sans-serif;color:#101828;padding:28px}
    h1{font-size:24px;margin:0 0 8px} h2{font-size:16px;margin:22px 0 8px}
    p{color:#667085;line-height:1.45}.metrics{margin:18px 0;padding:12px;border:1px solid #e4e7ec;background:#f8fafc}
    table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #e4e7ec;padding:8px;text-align:left;font-size:12px}th{background:#f2f4f7}
    li{margin:6px 0;font-size:12px}
  </style></head><body>${body}</body></html>`);
  target.document.close();
  target.focus();
  target.print();
}

function listHtml(items: string[]) {
  if (items.length === 0) return "<p>Nenhum registro.</p>";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function downloadFile(filename: string, content: string, type: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, minHeight: 42, minWidth: 160, paddingHorizontal: 12, color: "#101828", backgroundColor: "#fff" },
  searchInput: { minWidth: 320, flex: 1 },
  dateInput: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, minHeight: 42, width: 132, paddingHorizontal: 12, color: "#101828", backgroundColor: "#fff" },
  filterButton: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, minHeight: 34, justifyContent: "center", paddingHorizontal: 10, backgroundColor: "#fff" },
  filterButtonActive: { borderColor: "#5c7fa8", backgroundColor: "#f3f7fb" },
  filterButtonText: { color: "#344054", fontSize: 12, fontWeight: "900" },
  filterButtonTextActive: { color: "#405978" },
  primaryButton: { minHeight: 38, borderRadius: 8, backgroundColor: "#5c7fa8", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  secondaryButton: { minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: "#5c7fa8", paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  secondaryButtonText: { color: "#5c7fa8", fontWeight: "900", fontSize: 12 },
  caseRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  caseActions: { alignItems: "flex-end", gap: 8 },
  title: { color: "#101828", fontWeight: "900" },
  body: { color: "#667085", lineHeight: 21 },
  muted: { color: "#667085", fontSize: 12 },
  error: { color: "#b42318", fontWeight: "800" },
  flex: { flex: 1, minWidth: 0 },
  amount: { color: "#101828", fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  pressed: { opacity: 0.82 }
});
