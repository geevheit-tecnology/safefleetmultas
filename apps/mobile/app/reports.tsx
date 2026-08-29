import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getReportSummary, type ReportSummary } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function ReportsScreen() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getReportSummary()
      .then(setReport)
      .catch(() => setError("Nao foi possivel carregar o relatorio executivo."));
  }, []);

  return (
    <AppShell title="Relatorios" subtitle="Resumo executivo, exposicao e historico regulatorio">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!report ? <Text style={styles.body}>Carregando relatorio...</Text> : null}
      {report ? (
        <>
          <View style={styles.metrics}>
            <InfoCard label="Exposicao ativa" value={money.format(report.overview.financialExposure)} tone="#b42318" />
            <InfoCard label="Risco medio" value={`${Math.round(report.overview.averageRiskScore)}/100`} tone="#b76e00" />
            <InfoCard label="Prontuarios ativos" value={String(report.overview.activeCases)} />
            <InfoCard label="Criticos" value={String(report.overview.criticalCases)} tone="#b42318" />
          </View>

          <Panel title="Situacao consolidada">
            <Text style={styles.title}>{report.organizationName}</Text>
            <Text style={styles.body}>
              {report.overview.totalCases} prontuarios registrados, {report.overview.closedCases} encerrados, {report.deadlines.pending} prazos pendentes,
              {" "}{report.deadlines.overdue} vencidos e {report.deadlines.upcoming} nos proximos 15 dias.
            </Text>
            <Pill text={`Gerado ${new Date(report.generatedAt).toLocaleString("pt-BR")}`} tone="#175cd3" />
          </Panel>

          <View style={styles.columns}>
            <BreakdownPanel title="Por status" rows={report.byStatus} />
            <BreakdownPanel title="Por risco" rows={report.byRisk} />
            <BreakdownPanel title="Por categoria" rows={report.byCategory} />
          </View>

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

function BreakdownPanel({ title, rows }: { title: string; rows: Array<{ label: string; count: number; amount: number }> }) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? <Text style={styles.body}>Sem dados.</Text> : null}
      {rows.map((item) => (
        <View key={item.label} style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{item.label}</Text>
            <Text style={styles.muted}>{item.count} prontuario(s)</Text>
          </View>
          <Text style={styles.amount}>{money.format(item.amount)}</Text>
        </View>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  title: { color: "#101828", fontWeight: "900" },
  body: { color: "#667085", lineHeight: 21 },
  muted: { color: "#667085", fontSize: 12 },
  error: { color: "#b42318", fontWeight: "800" },
  flex: { flex: 1 },
  amount: { color: "#101828", fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 }
});
