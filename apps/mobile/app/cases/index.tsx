import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { listCases } from "../../src/api/client";
import { AppShell } from "../../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../../src/ui/Primitives";
import { cases as demoCases, type RegulatoryCase } from "../../src/data/demo";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CasesScreen() {
  const [cases, setCases] = useState<RegulatoryCase[]>(demoCases);

  useEffect(() => {
    void listCases().then((items) => setCases(items.length > 0 ? items : demoCases));
  }, []);

  return (
    <AppShell title="Prontuarios" subtitle="Autos e ocorrencias tratados como prontuario regulatorio">
      <View style={styles.metrics}>
        <InfoCard label="Total" value={String(cases.length)} />
        <InfoCard label="Em tratamento" value={String(cases.filter((item) => item.status === "IN_TREATMENT").length)} tone="#175cd3" />
        <InfoCard label="Aguardando acao" value={String(cases.filter((item) => item.status === "ACTION_REQUIRED").length)} tone="#b42318" />
        <InfoCard label="Com documento" value={String(cases.filter((item) => item.documents.length > 0).length)} tone="#067647" />
      </View>
      <Panel title="Lista de casos">
        {cases.map((item) => (
          <Link key={item.id} href={`/cases/${item.id}`} style={styles.link}>
            <View style={styles.caseRow}>
              <View style={styles.flex}>
                <Text style={styles.caseNumber}>{item.caseNumber}</Text>
                <Text style={styles.title}>{item.category} · {item.subcategory}</Text>
                <Text style={styles.muted}>{item.vehiclePlate ?? "sem placa"} · {item.responsible} · {money.format(item.amount)}</Text>
              </View>
              <View style={styles.right}>
                <Pill text={`${item.riskLevel} ${item.riskScore}`} tone={item.riskLevel === "CRITICAL" ? "#b42318" : "#175cd3"} />
                <Text style={styles.status}>{item.status}</Text>
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
  link: { textDecorationLine: "none" },
  caseRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  right: { alignItems: "flex-end", gap: 6 },
  caseNumber: { color: "#175cd3", fontWeight: "900", fontSize: 12 },
  title: { color: "#101828", fontWeight: "900", fontSize: 15 },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 },
  status: { color: "#667085", fontWeight: "800", fontSize: 11 }
});
