import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { Panel, Pill } from "../src/ui/Primitives";

const changes = [
  { title: "Alteracao regulatoria detectada", impact: "MEDIUM", detail: "Entrada manual demo. Precisa de conferencia em fonte oficial." },
  { title: "Tema CIOT com possivel impacto", impact: "HIGH", detail: "3 prontuarios podem estar relacionados. Nao e conclusao juridica." },
  { title: "Prazo processual em revisao", impact: "NOT_VERIFIED", detail: "Sem fonte oficial confirmada no ambiente atual." }
];

export default function RadarScreen() {
  return (
    <AppShell title="Radar Regulatorio" subtitle="Novas normas, comparacao e impacto de apoio">
      <Panel title="Novidades e impactos">
        {changes.map((item) => (
          <View key={item.title} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>{item.detail}</Text>
            </View>
            <Pill text={item.impact} tone={item.impact === "HIGH" ? "#b42318" : "#b76e00"} />
          </View>
        ))}
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  title: { color: "#101828", fontWeight: "900" },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 }
});
