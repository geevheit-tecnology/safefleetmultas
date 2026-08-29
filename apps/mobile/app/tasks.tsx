import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";
import { cases } from "../src/data/demo";

export default function TasksScreen() {
  const actions = cases.flatMap((item) => item.actions.map((action) => ({ ...action, caseNumber: item.caseNumber, responsible: item.responsible })));

  return (
    <AppShell title="Tarefas" subtitle="Minha fila, acoes do dia e documentos pendentes">
      <View style={styles.metrics}>
        <InfoCard label="Pendentes" value={String(actions.filter((item) => item.status === "PENDING").length)} tone="#b42318" />
        <InfoCard label="Em andamento" value={String(actions.filter((item) => item.status === "IN_PROGRESS").length)} tone="#175cd3" />
        <InfoCard label="Concluidas" value={String(actions.filter((item) => item.status === "DONE").length)} tone="#067647" />
      </View>
      <Panel title="Minha fila">
        {actions.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>{item.caseNumber} · {item.responsible} · vence {item.dueDate}</Text>
            </View>
            <Pill text={item.status} tone={item.priority === "HIGH" ? "#b42318" : "#175cd3"} />
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
