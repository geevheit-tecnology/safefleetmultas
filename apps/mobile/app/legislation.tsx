import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { listLegalDocuments, type LegalDocumentSummary } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function LegislationScreen() {
  const [laws, setLaws] = useState<LegalDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listLegalDocuments()
      .then(setLaws)
      .catch(() => setError("Nao foi possivel carregar a biblioteca regulatoria."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Legislacao" subtitle="Biblioteca versionada por vigencia e fonte oficial">
      <View style={styles.metrics}>
        <InfoCard label="Normas" value={String(laws.length)} />
        <InfoCard label="A validar" value={String(laws.filter((item) => item.status === "NOT_VERIFIED").length)} tone="#b76e00" />
        <InfoCard label="Versoes" value={String(laws.reduce((sum, item) => sum + item.versions, 0))} />
      </View>
      <Panel title="Biblioteca">
        {loading ? <Text style={styles.muted}>Carregando legislacao...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && laws.length === 0 ? <Text style={styles.muted}>Nenhuma norma cadastrada.</Text> : null}
        {laws.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>{item.effective} · {item.authority} · {item.source}</Text>
            </View>
            <Pill text={item.status} tone={item.status === "NOT_VERIFIED" ? "#b76e00" : "#067647"} />
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
  muted: { color: "#667085", fontSize: 12, marginTop: 3 },
  error: { color: "#b42318", fontWeight: "800" }
});
