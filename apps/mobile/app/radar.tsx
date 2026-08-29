import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { listRegulatoryChanges, type RegulatoryChangeSummary } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function RadarScreen() {
  const [changes, setChanges] = useState<RegulatoryChangeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listRegulatoryChanges()
      .then(setChanges)
      .catch(() => setError("Nao foi possivel carregar o radar regulatorio."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Radar Regulatorio" subtitle="Novas normas, comparacao e impacto de apoio">
      <View style={styles.metrics}>
        <InfoCard label="Mudancas" value={String(changes.length)} />
        <InfoCard label="Alto impacto" value={String(changes.filter((item) => item.impact === "HIGH").length)} tone="#b42318" />
        <InfoCard label="A validar" value={String(changes.filter((item) => item.impact === "NOT_VERIFIED").length)} tone="#b76e00" />
      </View>
      <Panel title="Novidades e impactos">
        {loading ? <Text style={styles.muted}>Carregando radar...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && changes.length === 0 ? <Text style={styles.muted}>Nenhuma mudanca regulatoria cadastrada.</Text> : null}
        {changes.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>{item.legalDocument} · detectado {item.detectedAt}</Text>
              <Text style={styles.body}>{item.detail}</Text>
            </View>
            <Pill text={item.impact} tone={item.impact === "HIGH" ? "#b42318" : "#b76e00"} />
          </View>
        ))}
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  title: { color: "#101828", fontWeight: "900" },
  body: { color: "#667085", lineHeight: 20, marginTop: 4 },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 },
  error: { color: "#b42318", fontWeight: "800" }
});
