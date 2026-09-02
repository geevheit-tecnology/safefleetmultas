import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getDashboard, listCases } from "../src/api/client";
import { useLanguage } from "../src/i18n";
import { AppShell } from "../src/ui/AppShell";
import { tokens } from "../src/ui/tokens";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";
import { cases as demoCases, dashboard as demoDashboard, type RegulatoryCase } from "../src/data/demo";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardScreen() {
  const [cases, setCases] = useState<RegulatoryCase[]>(demoCases);
  const [dashboard, setDashboard] = useState(demoDashboard);
  const { t, codeLabel } = useLanguage();

  useEffect(() => {
    void Promise.all([listCases(), getDashboard()]).then(([caseItems, metrics]) => {
      setCases(caseItems.length > 0 ? caseItems : demoCases);
      setDashboard({ ...demoDashboard, ...metrics });
    });
  }, []);

  const criticalCases = cases.filter((item) => item.riskLevel === "CRITICAL");
  const deadlines = cases.flatMap((item) => item.deadlines.map((deadline) => ({ ...deadline, caseNumber: item.caseNumber })));
  const openActions = cases.flatMap((item) => item.actions.map((action) => ({ ...action, caseNumber: item.caseNumber })));
  const topRiskCase = [...cases].sort((a, b) => b.riskScore - a.riskScore)[0];
  const nearestDeadline = [...deadlines].sort((a, b) => a.daysLeft - b.daysLeft)[0];
  const highActions = openActions.filter((action) => action.priority === "HIGH" && action.status !== "DONE");

  return (
    <AppShell title={t("dashboardTitle")} subtitle={t("dashboardSubtitle")}>
      <View style={styles.metrics}>
        <InfoCard label={t("financialExposure")} value={money.format(dashboard.financialExposure)} tone="#b42318" />
        <InfoCard label={t("criticalCases")} value={String(dashboard.criticalCases)} tone="#b42318" />
        <InfoCard label={t("upcomingDeadlines")} value={String(dashboard.upcomingDeadlines)} tone="#b76e00" />
        <InfoCard label={t("activeCases")} value={String(dashboard.activeCases)} tone={tokens.colors.primary} />
        <InfoCard label={t("overdueDeadlines")} value={String(dashboard.overdueDeadlines ?? 0)} tone="#b42318" />
        <InfoCard label={t("closedCases")} value={String(dashboard.closedCases ?? 0)} />
      </View>

      <View style={styles.commandPanel}>
        <View style={styles.commandHeader}>
          <View style={styles.commandTitleWrap}>
            <Text style={styles.commandKicker}>Resumo executivo</Text>
            <Text style={styles.commandTitle}>Prioridades operacionais</Text>
          </View>
          <Pill text={`${dashboard.regulatoryScore}/100 indice SafeFleet`} tone="#17745b" />
        </View>
        <View style={styles.commandGrid}>
          <ExecutiveSignal
            icon="alert-octagon-outline"
            title="Maior risco"
            value={topRiskCase ? `${topRiskCase.caseNumber} · ${codeLabel(topRiskCase.riskLevel)} ${topRiskCase.riskScore}` : "Sem caso critico"}
            detail={topRiskCase ? `${topRiskCase.category} · ${topRiskCase.responsible}` : "Nenhum item pendente de risco alto."}
            tone="#b23b3b"
          />
          <ExecutiveSignal
            icon="cash-multiple"
            title="Exposicao aberta"
            value={money.format(dashboard.financialExposure)}
            detail={`${dashboard.activeCases} prontuario(s) ativos em acompanhamento.`}
            tone="#8a4b14"
          />
          <ExecutiveSignal
            icon="calendar-clock"
            title="Prazo mais proximo"
            value={nearestDeadline ? `${nearestDeadline.daysLeft} dia(s)` : "Sem prazo proximo"}
            detail={nearestDeadline ? `${nearestDeadline.caseNumber} · ${nearestDeadline.type}` : "Fila sem vencimento curto."}
            tone="#9a6200"
          />
          <ExecutiveSignal
            icon="clipboard-check-outline"
            title="Acao critica"
            value={`${highActions.length} pendente(s)`}
            detail={highActions[0] ? `${highActions[0].caseNumber} · ${highActions[0].title}` : "Sem acao critica aberta."}
            tone="#405978"
          />
        </View>
      </View>

      <View style={styles.quickActions}>
        <Link href="/tasks" style={styles.quickAction}>
          <View style={styles.quickIconDanger}>
            <MaterialCommunityIcons name="bell-alert-outline" size={20} color="#b23b3b" />
          </View>
          <Text style={styles.quickTitle}>{t("navAlerts")}</Text>
          <Text style={styles.quickNumber}>{dashboard.overdueDeadlines ?? 0}</Text>
          <Text style={styles.quickMeta}>{t("overdueCount")}</Text>
        </Link>
        <Link href="/cases" style={styles.quickAction}>
          <View style={styles.quickIconWarning}>
            <MaterialCommunityIcons name="calendar-alert" size={20} color="#9a6200" />
          </View>
          <Text style={styles.quickTitle}>{t("navDeadlines")}</Text>
          <Text style={styles.quickNumber}>{dashboard.upcomingDeadlines}</Text>
          <Text style={styles.quickMeta}>{t("upcomingCount")}</Text>
        </Link>
        <Link href="/cases" style={styles.quickAction}>
          <View style={styles.quickIconInfo}>
            <MaterialCommunityIcons name="folder-search-outline" size={20} color={tokens.colors.primary} />
          </View>
          <Text style={styles.quickTitle}>{t("navRecords")}</Text>
          <Text style={styles.quickNumber}>{dashboard.activeCases}</Text>
          <Text style={styles.quickMeta}>{t("activeCount")}</Text>
        </Link>
        <Link href="/new-case" style={styles.quickAction}>
          <View style={styles.quickIconSuccess}>
            <MaterialCommunityIcons name="camera-plus-outline" size={20} color="#17745b" />
          </View>
          <Text style={styles.quickTitle}>{t("navDocument")}</Text>
          <Text style={styles.quickNumber}>OCR</Text>
          <Text style={styles.quickMeta}>{t("photographAttach")}</Text>
        </Link>
      </View>

      <View style={styles.scorePanel}>
        <View style={styles.scoreCircle}>
          <Text style={styles.score}>{dashboard.regulatoryScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{t("maturityIndex")}</Text>
          <Text style={styles.body}>{t("internalIndicator")}</Text>
          <View style={styles.scoreGrid}>
            <Pill text={`${t("deadlinesScore")} ${dashboard.scoreComponents?.deadlines ?? 0}`} />
            <Pill text={`${t("documentationScore")} ${dashboard.scoreComponents?.documentation ?? 0}`} />
            <Pill text={`${t("ciotScore")} ${dashboard.scoreComponents?.ciot ?? 0}`} />
            <Pill text={`${t("floorMinimumScore")} ${dashboard.scoreComponents?.floorMinimum ?? 0}`} />
            <Pill text={`${t("processesScore")} ${dashboard.scoreComponents?.processes ?? 0}`} />
            <Pill text={`${t("recurrenceScore")} ${dashboard.scoreComponents?.repetition ?? 0}`} />
            <Pill text={`${t("preventionScore")} ${dashboard.scoreComponents?.prevention ?? 0}`} />
          </View>
        </View>
      </View>

      <View style={styles.columns}>
        <Panel title={t("criticalCases")}>
          {criticalCases.map((item) => (
            <Link key={item.id} href={`/cases/${item.id}`} style={styles.link}>
              <View style={styles.alertRow}>
                <MaterialCommunityIcons name="alert-octagon" size={22} color="#b42318" />
                <View style={styles.flex}>
                  <Text style={styles.caseNumber}>{item.caseNumber}</Text>
                  <Text style={styles.itemTitle}>{item.category} · {item.subcategory}</Text>
                  <Text style={styles.muted}>{item.responsible} · {item.vehiclePlate ?? "sem placa"}</Text>
                </View>
                <Pill text={`${codeLabel(item.riskLevel)} ${item.riskScore}`} tone="#b42318" />
              </View>
            </Link>
          ))}
        </Panel>

        <Panel title={t("upcomingDeadlines")}>
          {deadlines.map((item) => (
            <View key={item.id} style={styles.deadlineRow}>
              <View style={styles.daysBox}>
                <Text style={styles.days}>{item.daysLeft}</Text>
                <Text style={styles.daysLabel}>dias</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{item.type}</Text>
                <Text style={styles.muted}>{item.caseNumber} · base {codeLabel(item.basis)}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </View>

      <Panel title={t("operationalQueue")}>
        {openActions.map((action) => (
          <View key={action.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{action.title}</Text>
              <Text style={styles.muted}>{action.caseNumber} · vence {action.dueDate}</Text>
            </View>
            <Pill text={codeLabel(action.status)} tone={action.priority === "HIGH" ? "#b42318" : tokens.colors.primary} />
          </View>
        ))}
      </Panel>

      <View style={styles.columns}>
        <Panel title={t("trends")}>
          {(dashboard.trends ?? []).map((trend) => (
            <View key={trend.month} style={styles.listRow}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{trend.month}</Text>
                <Text style={styles.muted}>{trend.cases} caso(s) · {money.format(trend.amount)}</Text>
              </View>
              <Pill text={codeLabel("MONTH")} />
            </View>
          ))}
        </Panel>

        <Panel title={t("legislativeChanges")}>
          {(dashboard.regulatoryChanges ?? []).map((change) => (
            <View key={`${change.title}-${change.detectedAt}`} style={styles.listRow}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{change.title}</Text>
                <Text style={styles.muted}>detectado {change.detectedAt}</Text>
              </View>
              <Pill text={codeLabel(change.impact)} tone={change.impact === "HIGH" ? "#b42318" : "#b76e00"} />
            </View>
          ))}
        </Panel>
      </View>
    </AppShell>
  );
}

function ExecutiveSignal({
  icon,
  title,
  value,
  detail,
  tone
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <View style={styles.signal}>
      <View style={[styles.signalIcon, { backgroundColor: `${tone}14` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={tone} />
      </View>
      <View style={styles.signalBody}>
        <Text style={styles.signalTitle}>{title}</Text>
        <Text style={[styles.signalValue, { color: tone }]}>{value}</Text>
        <Text style={styles.signalDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  commandPanel: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4e7ec", padding: 16, gap: 14 },
  commandHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  commandTitleWrap: { flex: 1, minWidth: 220 },
  commandKicker: { color: "#667085", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  commandTitle: { color: "#101828", fontSize: 18, fontWeight: "900", marginTop: 2 },
  commandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  signal: { minWidth: 220, flex: 1, flexDirection: "row", gap: 12, borderWidth: 1, borderColor: "#edf0f4", borderRadius: 8, backgroundColor: "#fbfcfe", padding: 12, minHeight: 112 },
  signalIcon: { width: 38, height: 38, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  signalBody: { flex: 1, minWidth: 0 },
  signalTitle: { color: "#667085", fontSize: 12, fontWeight: "800" },
  signalValue: { fontSize: 16, lineHeight: 21, fontWeight: "900", marginTop: 5, flexShrink: 1 },
  signalDetail: { color: "#667085", fontSize: 12, lineHeight: 17, marginTop: 4, flexShrink: 1 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: { minWidth: 132, flex: 1, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e7ec", borderRadius: 8, padding: 12, textDecorationLine: "none", minHeight: 132 },
  quickIconDanger: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff1f1" },
  quickIconWarning: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff8eb" },
  quickIconInfo: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#eef4fb" },
  quickIconSuccess: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#edf8f4" },
  quickTitle: { color: "#101828", fontWeight: "900", marginTop: 8, flexShrink: 1 },
  quickNumber: { color: "#101828", fontWeight: "900", fontSize: 24, lineHeight: 29, marginTop: 8 },
  quickMeta: { color: "#667085", fontSize: 12, marginTop: 1, flexShrink: 1 },
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
  alertRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 0 },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 0 },
  daysBox: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#fff7ed", alignItems: "center", justifyContent: "center" },
  days: { color: "#b76e00", fontWeight: "900", fontSize: 18 },
  daysLabel: { color: "#b76e00", fontSize: 10, fontWeight: "700" },
  caseNumber: { color: "#5c7fa8", fontWeight: "900", fontSize: 12 },
  itemTitle: { color: "#101828", fontWeight: "800", flexShrink: 1 },
  muted: { color: "#667085", fontSize: 12, flexShrink: 1 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1, minWidth: 0 }
});
