import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

const insights = [
  { title: "Possivel ocorrencia relacionada", text: "Casos de CIOT possuem padrao operacional semelhante. Exige validacao humana.", tone: "#b76e00" },
  { title: "Causa provavel", text: "Falha documental aparece como principal causa demo.", tone: "#175cd3" },
  { title: "Prevencao", text: "Checklist documental antes do carregamento reduz risco operacional.", tone: "#067647" }
];

export default function IntelligenceScreen() {
  return (
    <AppShell title="Inteligencia" subtitle="Tendencias, prevencao e analise de apoio">
      <View style={styles.metrics}>
        <InfoCard label="Regulatory Score" value="72/100" tone="#067647" />
        <InfoCard label="Casos relacionados" value="3" tone="#b76e00" />
        <InfoCard label="Causas mapeadas" value="5" tone="#175cd3" />
      </View>
      <Panel title="Insights">
        {insights.map((item) => (
          <View key={item.title} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>{item.text}</Text>
            </View>
            <Pill text="APOIO" tone={item.tone} />
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
