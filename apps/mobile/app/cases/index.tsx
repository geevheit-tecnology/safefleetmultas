import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { listCases } from "../../src/api/client";
import { useLanguage } from "../../src/i18n";
import { AppShell } from "../../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../../src/ui/Primitives";
import type { RegulatoryCase } from "../../src/data/demo";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CasesScreen() {
  const [cases, setCases] = useState<RegulatoryCase[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [riskFilter, setRiskFilter] = useState("TODOS");
  const { codeLabel } = useLanguage();

  useEffect(() => {
    void listCases().then(setCases);
  }, []);

  const filteredCases = cases.filter((item) => {
    const search = query.trim().toLowerCase();
    const matchesSearch =
      !search ||
      [item.caseNumber, item.infractionNumber, item.category, item.subcategory, item.vehiclePlate, item.rntrc, item.responsible]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    const matchesStatus = statusFilter === "TODOS" || item.status === statusFilter;
    const matchesRisk = riskFilter === "TODOS" || item.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });
  const statuses = ["TODOS", ...Array.from(new Set(cases.map((item) => item.status)))];
  const risks = ["TODOS", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <AppShell title="Prontuarios" subtitle="Autos e ocorrencias tratados como prontuario regulatorio">
      <View style={styles.metrics}>
        <InfoCard label="Total" value={String(cases.length)} />
        <InfoCard label="Em tratamento" value={String(cases.filter((item) => item.status === "IN_TREATMENT").length)} tone="#5c7fa8" />
        <InfoCard label="Aguardando acao" value={String(cases.filter((item) => item.status === "ACTION_REQUIRED").length)} tone="#b42318" />
        <InfoCard label="Com documento" value={String(cases.filter((item) => item.documents.length > 0).length)} tone="#067647" />
      </View>
      <Panel title="Filtros">
        <View style={styles.filterHeader}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.search}
            placeholder="Buscar por prontuario, auto, categoria, placa ou RNTRC"
            placeholderTextColor="#98a2b3"
          />
          <Link href="/new-case" asChild>
            <Pressable style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <Text style={styles.createButtonText}>Criar ocorrencia</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.chips}>
          {statuses.map((status) => (
            <Pressable key={status} onPress={() => setStatusFilter(status)} style={[styles.chip, statusFilter === status && styles.chipActive]}>
              <Text style={[styles.chipText, statusFilter === status && styles.chipTextActive]}>{codeLabel(status)}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chips}>
          {risks.map((risk) => (
            <Pressable key={risk} onPress={() => setRiskFilter(risk)} style={[styles.chip, riskFilter === risk && styles.chipActive]}>
              <Text style={[styles.chipText, riskFilter === risk && styles.chipTextActive]}>{codeLabel(risk)}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>
      <Panel title="Lista de casos">
        {filteredCases.length === 0 ? <Text style={styles.muted}>Nenhum prontuario encontrado com os filtros atuais.</Text> : null}
        {filteredCases.map((item) => (
          <Link key={item.id} href={`/cases/${item.id}`} style={styles.link}>
            <View style={styles.caseRow}>
              <View style={styles.flex}>
                <Text style={styles.caseNumber}>{item.caseNumber}</Text>
                <Text style={styles.title}>{item.category} · {item.subcategory}</Text>
                <Text style={styles.muted}>{item.vehiclePlate ?? "sem placa"} · {item.responsible} · {money.format(item.amount)}</Text>
              </View>
              <View style={styles.right}>
                <Pill text={`${codeLabel(item.riskLevel)} ${item.riskScore}`} tone={item.riskLevel === "CRITICAL" ? "#b42318" : "#5c7fa8"} />
                <Text style={styles.status}>{codeLabel(item.status)}</Text>
              </View>
            </View>
          </Link>
        ))}
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  filterHeader: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  search: { minHeight: 42, minWidth: 240, flex: 1, borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, color: "#101828", backgroundColor: "#ffffff" },
  createButton: { minHeight: 42, justifyContent: "center", borderRadius: 8, paddingHorizontal: 14, backgroundColor: "#5c7fa8" },
  createButtonText: { color: "#ffffff", fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 34, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "#d0d5dd", paddingHorizontal: 10, backgroundColor: "#ffffff" },
  chipActive: { borderColor: "#5c7fa8", backgroundColor: "#eef4fb" },
  chipText: { color: "#344054", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#5c7fa8" },
  link: { textDecorationLine: "none" },
  caseRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 0 },
  flex: { flex: 1, minWidth: 0 },
  right: { alignItems: "flex-end", gap: 6 },
  caseNumber: { color: "#5c7fa8", fontWeight: "900", fontSize: 12 },
  title: { color: "#101828", fontWeight: "900", fontSize: 15, flexShrink: 1 },
  muted: { color: "#667085", fontSize: 12, marginTop: 3, flexShrink: 1 },
  status: { color: "#667085", fontWeight: "800", fontSize: 11 },
  pressed: { opacity: 0.82 }
});
