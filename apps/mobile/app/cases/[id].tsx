import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getCase } from "../../src/api/client";
import { cases, type RegulatoryCase } from "../../src/data/demo";
import { AppShell } from "../../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../../src/ui/Primitives";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<RegulatoryCase>(cases.find((caseItem) => caseItem.id === id) ?? cases[0]);

  useEffect(() => {
    if (!id) return;
    void getCase(id).then((loaded) => {
      if (loaded) setItem(loaded);
    });
  }, [id]);

  return (
    <AppShell title={item.caseNumber} subtitle={`${item.category} · ${item.subcategory}`}>
      <Stack.Screen options={{ title: item.caseNumber }} />
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={styles.caseNumber}>{item.caseNumber}</Text>
          <Text style={styles.title}>{item.category} · {item.subcategory}</Text>
          <Text style={styles.body}>{item.description}</Text>
        </View>
        <Pill text={`${item.riskLevel} ${item.riskScore}/100`} tone={item.riskLevel === "CRITICAL" ? "#b42318" : "#175cd3"} />
      </View>

      <View style={styles.grid}>
        <InfoCard label="Status" value={item.status} />
        <InfoCard label="Valor" value={money.format(item.amount)} tone="#b42318" />
        <InfoCard label="Responsavel" value={item.responsible} />
        <InfoCard label="Placa" value={item.vehiclePlate ?? "nao informado"} />
        <InfoCard label="RNTRC" value={item.rntrc ?? "nao informado"} />
        <InfoCard label="Orgao" value={item.authority} />
      </View>

      <View style={styles.columns}>
        <Panel title="Diagnostico">
          <Text style={styles.itemTitle}>Base regulatoria</Text>
          <Text style={styles.body}>Fontes oficiais ainda nao verificadas neste ambiente. Qualquer prazo ou enquadramento fica como NOT_VERIFIED ate validacao humana.</Text>
          <Text style={styles.itemTitle}>Reincidencia</Text>
          <Text style={styles.body}>Possivel ocorrencia relacionada por tema. Nao e conclusao juridica automatica.</Text>
        </Panel>

        <Panel title="Alta regulatoria">
          {["Situacao final registrada", "Documento de decisao anexado", "Valor final atualizado", "Prazos encerrados", "Responsavel confirmou"].map((label) => (
            <View key={label} style={styles.checkRow}>
              <Text style={styles.checkbox}>□</Text>
              <Text style={styles.itemTitle}>{label}</Text>
            </View>
          ))}
        </Panel>
      </View>

      <Panel title="Prazos">
        {item.deadlines.map((deadline) => (
          <View key={deadline.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{deadline.type}</Text>
              <Text style={styles.muted}>vence {deadline.dueDate} · base {deadline.basis}</Text>
            </View>
            <Pill text={`${deadline.daysLeft} dias`} tone={deadline.daysLeft <= 3 ? "#b42318" : "#b76e00"} />
          </View>
        ))}
      </Panel>

      <Panel title="Timeline">
        {item.timeline.map((event) => (
          <View key={event.id} style={styles.timelineRow}>
            <Text style={styles.timelineDate}>{event.date}</Text>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{event.title}</Text>
              <Text style={styles.body}>{event.description}</Text>
              <Text style={styles.muted}>{event.user}</Text>
            </View>
          </View>
        ))}
      </Panel>

      <Panel title="Acoes">
        {item.actions.map((action) => (
          <View key={action.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{action.title}</Text>
              <Text style={styles.muted}>{action.priority} · {action.dueDate}</Text>
            </View>
            <Pill text={action.status} tone={action.priority === "HIGH" ? "#b42318" : "#175cd3"} />
          </View>
        ))}
      </Panel>

      <Panel title="Documentos">
        {item.documents.length === 0 ? <Text style={styles.body}>Nenhum documento anexado.</Text> : null}
        {item.documents.map((doc) => (
          <View key={doc.id} style={styles.listRow}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{doc.name}</Text>
              <Text style={styles.muted}>{doc.type} · v{doc.version} · {doc.storageKey}</Text>
            </View>
            <Pill text="S3 KEY" tone="#10243f" />
          </View>
        ))}
      </Panel>

      <Panel title="Auditoria">
        {item.timeline.map((event) => (
          <Text key={`audit-${event.id}`} style={styles.muted}>append-only · {event.date} · {event.user} · {event.title}</Text>
        ))}
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4e7ec", padding: 18, gap: 12, flexDirection: "row", alignItems: "flex-start" },
  caseNumber: { color: "#175cd3", fontWeight: "900", fontSize: 13 },
  title: { color: "#101828", fontSize: 24, fontWeight: "900" },
  body: { color: "#667085", lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  timelineRow: { flexDirection: "row", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  timelineDate: { width: 74, color: "#344054", fontWeight: "800", fontSize: 12 },
  flex: { flex: 1 },
  itemTitle: { color: "#101828", fontWeight: "800" },
  muted: { color: "#667085", fontSize: 12 },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 },
  checkbox: { color: "#667085", fontSize: 18, fontWeight: "900" }
});
