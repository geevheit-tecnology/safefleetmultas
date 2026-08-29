import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

const laws = [
  { title: "Resolucao ANTT sobre CIOT", status: "NOT_VERIFIED", effective: "vigencia a confirmar", source: "Fonte oficial pendente" },
  { title: "Lei do Piso Minimo", status: "NOT_VERIFIED", effective: "vigencia a confirmar", source: "Fonte oficial pendente" },
  { title: "Normas de processo administrativo", status: "NOT_VERIFIED", effective: "vigencia a confirmar", source: "Fonte oficial pendente" }
];

export default function LegislationScreen() {
  return (
    <AppShell title="Legislacao" subtitle="Biblioteca versionada por vigencia e fonte oficial">
      <View style={styles.metrics}>
        <InfoCard label="Normas demo" value={String(laws.length)} />
        <InfoCard label="A validar" value={String(laws.filter((item) => item.status === "NOT_VERIFIED").length)} tone="#b76e00" />
      </View>
      <Panel title="Biblioteca">
        {laws.map((item) => (
          <View key={item.title} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>{item.effective} · {item.source}</Text>
            </View>
            <Pill text={item.status} tone="#b76e00" />
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
  muted: { color: "#667085", fontSize: 12, marginTop: 3 }
});
