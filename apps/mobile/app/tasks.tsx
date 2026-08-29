import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { listTasks, updateTaskStatus, type CaseAction } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function TasksScreen() {
  const [actions, setActions] = useState<CaseAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      setError(null);
      setActions(await listTasks());
    } catch {
      setError("Nao foi possivel carregar a fila de tarefas.");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (id: string, status: "IN_PROGRESS" | "DONE") => {
    setUpdatingId(id);
    setError(null);
    try {
      const updated = await updateTaskStatus(id, status);
      setActions((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch {
      setError("Nao foi possivel atualizar a tarefa.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppShell title="Tarefas" subtitle="Minha fila, acoes do dia e documentos pendentes">
      <View style={styles.metrics}>
        <InfoCard label="Pendentes" value={String(actions.filter((item) => item.status === "PENDING").length)} tone="#b42318" />
        <InfoCard label="Em andamento" value={String(actions.filter((item) => item.status === "IN_PROGRESS").length)} tone="#175cd3" />
        <InfoCard label="Concluidas" value={String(actions.filter((item) => item.status === "DONE").length)} tone="#067647" />
      </View>
      <Panel title="Minha fila">
        {loading ? <Text style={styles.muted}>Carregando tarefas...</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && actions.length === 0 ? <Text style={styles.muted}>Nenhuma tarefa cadastrada.</Text> : null}
        {actions.map((item) => (
          <View key={item.id} style={styles.row}>
            <Link href={`/cases/${item.caseId}`} asChild>
              <Pressable style={styles.flex}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.muted}>{item.caseNumber} · {item.responsible} · vence {item.dueDate || "sem prazo"}</Text>
              </Pressable>
            </Link>
            <View style={styles.statusArea}>
              <Pill text={item.status} tone={item.priority === "HIGH" ? "#b42318" : "#175cd3"} />
              {item.status === "PENDING" ? (
                <TaskButton label="Iniciar" disabled={updatingId === item.id} onPress={() => changeStatus(item.id, "IN_PROGRESS")} />
              ) : null}
              {item.status !== "DONE" ? (
                <TaskButton label="Concluir" disabled={updatingId === item.id} onPress={() => changeStatus(item.id, "DONE")} />
              ) : null}
            </View>
          </View>
        ))}
      </Panel>
    </AppShell>
  );
}

function TaskButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  title: { color: "#101828", fontWeight: "900" },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 },
  error: { color: "#b42318", fontWeight: "800" },
  statusArea: { alignItems: "flex-end", gap: 8 },
  button: { minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: "#175cd3", paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#175cd3", fontWeight: "900", fontSize: 12 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.5 }
});
