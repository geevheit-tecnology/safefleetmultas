import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";
import { cases, dashboard } from "../src/data/demo";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function ReportsScreen() {
  return (
    <AppShell title="Relatorios" subtitle="Resumo executivo, exposicao e historico regulatorio">
      <View style={styles.metrics}>
        <InfoCard label="Exposicao ativa" value={money.format(dashboard.financialExposure)} tone="#b42318" />
        <InfoCard label="Score regulatorio" value={`${dashboard.regulatoryScore}/100`} tone="#067647" />
        <InfoCard label="Prontuarios" value={String(cases.length)} />
      </View>
      <Panel title="Relatorio executivo">
        <Text style={styles.title}>Situacao consolidada</Text>
        <Text style={styles.body}>A transportadora possui {dashboard.activeCases} casos ativos, {dashboard.criticalCases} critico e {dashboard.upcomingDeadlines} prazos proximos. Relatorio PDF real sera gerado pelo backend para manter rastreabilidade e auditoria.</Text>
        <Pill text="PDF BACKEND PENDENTE" tone="#b76e00" />
      </Panel>
      <Panel title="Exportacoes previstas">
        {["Prontuario completo", "Timeline auditavel", "Exposicao financeira", "Radar regulatorio", "Maturidade regulatoria"].map((item) => (
          <View key={item} style={styles.row}>
            <Text style={styles.title}>{item}</Text>
            <Pill text="DEMO" tone="#175cd3" />
          </View>
        ))}
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  title: { color: "#101828", fontWeight: "900" },
  body: { color: "#667085", lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 10, borderTopColor: "#f2f4f7", borderTopWidth: 1 }
});
