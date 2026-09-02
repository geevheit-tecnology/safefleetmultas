import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getIntelligenceSummary, type IntelligenceSummary } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function IntelligenceScreen() {
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getIntelligenceSummary()
      .then(setSummary)
      .catch(() => setError("Nao foi possivel carregar inteligencia operacional."));
  }, []);

  return (
    <AppShell title="Inteligencia" subtitle="Tendencias, prevencao e analise de apoio">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!summary ? <Text style={styles.muted}>Carregando inteligencia...</Text> : null}
      {summary ? (
        <>
          <View style={styles.metrics}>
            <InfoCard label="Indice SafeFleet" value={`${Math.round(100 - summary.metrics.averageRiskScore / 2)}/100`} tone="#067647" />
            <InfoCard label="Casos analisados" value={String(summary.metrics.totalCases)} />
            <InfoCard label="Transporte" value={String(summary.metrics.ciotCases)} tone="#b76e00" />
            <InfoCard label="Alto risco" value={String(summary.metrics.highRiskCases)} tone="#b42318" />
          </View>

          <Panel title="Analise preventiva">
            <Text style={styles.title}>{summary.preventive.analysisType}</Text>
            <Text style={styles.body}>{summary.preventive.content}</Text>
            <Text style={styles.muted}>Fonte: {summary.preventive.sourceReference}</Text>
            <View style={styles.pills}>
              <Pill text={summary.preventive.provider} tone="#5c7fa8" />
              {summary.protected ? <Pill text="Dados protegidos" tone="#067647" /> : null}
            </View>
          </Panel>

          <Panel title="Analises recentes">
            {summary.analyses.length === 0 ? <Text style={styles.body}>Nenhuma analise de apoio registrada.</Text> : null}
            {summary.analyses.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.caseNumber} · {item.analysisType}</Text>
                  <Text style={styles.body}>{item.content}</Text>
                  <Text style={styles.muted}>Fonte: {item.sourceReference} · {item.createdAt}</Text>
                </View>
                <Pill text="Apoio" tone="#b76e00" />
              </View>
            ))}
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  title: { color: "#101828", fontWeight: "900" },
  body: { color: "#667085", lineHeight: 21, marginTop: 4 },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  error: { color: "#b42318", fontWeight: "800" }
});
