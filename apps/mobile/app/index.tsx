import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getDashboard, listCases } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";
import { cases as demoCases, dashboard as demoDashboard, type RegulatoryCase } from "../src/data/demo";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardScreen() {
  const [cases, setCases] = useState<RegulatoryCase[]>(demoCases);
  const [dashboard, setDashboard] = useState(demoDashboard);

  useEffect(() => {
    void Promise.all([listCases(), getDashboard()]).then(([caseItems, metrics]) => {
      setCases(caseItems.length > 0 ? caseItems : demoCases);
      setDashboard({ ...demoDashboard, ...metrics });
    });
  }, []);

  const criticalCases = cases.filter((item) => item.riskLevel === "CRITICAL");
  const deadlines = cases.flatMap((item) => item.deadlines.map((deadline) => ({ ...deadline, caseNumber: item.caseNumber })));

  return (
    <AppShell title="Central Executiva" subtitle="Situacao regulatoria em poucos segundos">
      <View style={styles.metrics}>
        <InfoCard label="Exposicao financeira" value={money.format(dashboard.financialExposure)} tone="#b42318" />
        <InfoCard label="Casos criticos" value={String(dashboard.criticalCases)} tone="#b42318" />
        <InfoCard label="Prazos proximos" value={String(dashboard.upcomingDeadlines)} tone="#b76e00" />
        <InfoCard label="Casos ativos" value={String(dashboard.activeCases)} tone="#175cd3" />
        <InfoCard label="Prazos vencidos" value={String(dashboard.overdueDeadlines ?? 0)} tone="#b42318" />
        <InfoCard label="Encerrados" value={String(dashboard.closedCases ?? 0)} />
      </View>

      <View style={styles.scorePanel}>
        <View style={styles.scoreCircle}>
          <Text style={styles.score}>{dashboard.regulatoryScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>Indice de maturidade regulatoria</Text>
          <Text style={styles.body}>{dashboard.scoreDisclaimer ?? "Indicador interno, nao certificacao oficial."}</Text>
          <View style={styles.scoreGrid}>
            <Pill text={`Prazos ${dashboard.scoreComponents?.deadlines ?? 0}`} />
            <Pill text={`Documentacao ${dashboard.scoreComponents?.documentation ?? 0}`} />
            <Pill text={`CIOT ${dashboard.scoreComponents?.ciot ?? 0}`} />
            <Pill text={`Piso minimo ${dashboard.scoreComponents?.floorMinimum ?? 0}`} />
            <Pill text={`Processos ${dashboard.scoreComponents?.processes ?? 0}`} />
            <Pill text={`Reincidencia ${dashboard.scoreComponents?.repetition ?? 0}`} />
            <Pill text={`Prevencao ${dashboard.scoreComponents?.prevention ?? 0}`} />
          </View>
        </View>
      </View>

      <View style={styles.columns}>
        <Panel title="Casos criticos">
          {criticalCases.map((item) => (
            <Link key={item.id} href={`/cases/${item.id}`} style={styles.link}>
              <View style={styles.alertRow}>
                <MaterialCommunityIcons name="alert-octagon" size={22} color="#b42318" />
                <View style={styles.flex}>
                  <Text style={styles.caseNumber}>{item.caseNumber}</Text>
                  <Text style={styles.itemTitle}>{item.category} · {item.subcategory}</Text>
                  <Text style={styles.muted}>{item.responsible} · {item.vehiclePlate ?? "sem placa"}</Text>
                </View>
                <Pill text={`${item.riskLevel} ${item.riskScore}`} tone="#b42318" />
              </View>
            </Link>
          ))}
        </Panel>

        <Panel title="Prazos criticos">
          {deadlines.map((item) => (
            <View key={item.id} style={styles.deadlineRow}>
              <View style={styles.daysBox}>
                <Text style={styles.days}>{item.daysLeft}</Text>
                <Text style={styles.daysLabel}>dias</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{item.type}</Text>
                <Text style={styles.muted}>{item.caseNumber} · base {item.basis}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </View>

      <Panel title="Fila operacional">
        {cases.flatMap((item) => item.actions.map((action) => ({ ...action, caseNumber: item.caseNumber }))).map((action) => (
          <View key={action.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{action.title}</Text>
              <Text style={styles.muted}>{action.caseNumber} · vence {action.dueDate}</Text>
            </View>
            <Pill text={action.status} tone={action.priority === "HIGH" ? "#b42318" : "#175cd3"} />
          </View>
        ))}
      </Panel>

      <View style={styles.columns}>
        <Panel title="Tendencias">
          {(dashboard.trends ?? []).map((trend) => (
            <View key={trend.month} style={styles.listRow}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{trend.month}</Text>
                <Text style={styles.muted}>{trend.cases} caso(s) · {money.format(trend.amount)}</Text>
              </View>
              <Pill text="MES" />
            </View>
          ))}
        </Panel>

        <Panel title="Alteracoes legislativas">
          {(dashboard.regulatoryChanges ?? []).map((change) => (
            <View key={`${change.title}-${change.detectedAt}`} style={styles.listRow}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{change.title}</Text>
                <Text style={styles.muted}>detectado {change.detectedAt}</Text>
              </View>
              <Pill text={change.impact} tone={change.impact === "HIGH" ? "#b42318" : "#b76e00"} />
            </View>
          ))}
        </Panel>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  scorePanel: { backgroundColor: "#fff", borderRadius: 8, padding: 18, borderColor: "#e4e7ec", borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 16 },
  scoreCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 10, borderColor: "#12b76a", alignItems: "center", justifyContent: "center" },
  score: { fontSize: 25, fontWeight: "900", color: "#101828" },
  scoreMax: { color: "#667085", fontSize: 12 },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  flex: { flex: 1 },
  sectionTitle: { color: "#101828", fontSize: 16, fontWeight: "900" },
  body: { color: "#667085", lineHeight: 20, marginTop: 4 },
  link: { textDecorationLine: "none" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 420 },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 360 },
  daysBox: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  days: { color: "#b76e00", fontWeight: "900", fontSize: 18 },
  daysLabel: { color: "#b76e00", fontSize: 10, fontWeight: "700" },
  caseNumber: { color: "#175cd3", fontWeight: "900", fontSize: 12 },
  itemTitle: { color: "#101828", fontWeight: "800" },
  muted: { color: "#667085", fontSize: 12 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 }
});
