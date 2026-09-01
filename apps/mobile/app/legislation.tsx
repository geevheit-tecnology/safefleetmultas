import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { findEffectiveRule, listLegalDocuments, type EffectiveRuleSummary, type LegalDocumentSummary } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function LegislationScreen() {
  const [laws, setLaws] = useState<LegalDocumentSummary[]>([]);
  const [occurrenceDate, setOccurrenceDate] = useState("2026-08-20");
  const [topic, setTopic] = useState("CIOT");
  const [effectiveRule, setEffectiveRule] = useState<EffectiveRuleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingRule, setCheckingRule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listLegalDocuments()
      .then(setLaws)
      .catch(() => setError("Nao foi possivel carregar a biblioteca regulatoria."))
      .finally(() => setLoading(false));
  }, []);

  const handleFindEffectiveRule = async () => {
    setCheckingRule(true);
    setError(null);
    try {
      setEffectiveRule(await findEffectiveRule(occurrenceDate, topic));
    } catch {
      setError("Nao foi possivel consultar a regra vigente.");
    } finally {
      setCheckingRule(false);
    }
  };

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
              <Text style={styles.muted}>
                {[item.type, item.number, item.year].filter(Boolean).join(" ")} · {item.authority}
              </Text>
              <Text style={styles.muted}>
                Vigencia: {item.effectiveFrom || item.effective} {item.effectiveUntil ? `ate ${item.effectiveUntil}` : "sem fim informado"} · Versao {item.currentVersion ?? "sem versao"} · {item.versions} registro(s)
              </Text>
              <Text style={styles.muted}>Fonte: {item.source || "fonte oficial pendente"} · Hash: {item.sourceHash || "pendente"}</Text>
            </View>
            <Pill text={item.status} tone={item.status === "NOT_VERIFIED" ? "#b76e00" : "#067647"} />
          </View>
        ))}
      </Panel>

      <Panel title="Regra vigente na data">
        <View style={styles.form}>
          <TextInput value={occurrenceDate} onChangeText={setOccurrenceDate} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#98a2b3" />
          <TextInput value={topic} onChangeText={setTopic} style={[styles.input, styles.topicInput]} placeholder="Tema" placeholderTextColor="#98a2b3" />
          <Pressable style={styles.button} onPress={handleFindEffectiveRule} disabled={checkingRule}>
            <Text style={styles.buttonText}>{checkingRule ? "Consultando..." : "Consultar"}</Text>
          </Pressable>
        </View>
        {effectiveRule ? (
          <View style={styles.ruleResult}>
            <Text style={styles.muted}>{effectiveRule.sourceRule}</Text>
            {effectiveRule.matches.length === 0 ? <Text style={styles.muted}>Nenhuma versao vigente encontrada para a data informada.</Text> : null}
            {effectiveRule.matches.map((item) => (
              <View key={`${item.id}-${item.versionLabel}`} style={styles.ruleRow}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.muted}>Versao {item.versionLabel} · {item.effectiveFrom || "inicio nao informado"} {item.effectiveUntil ? `ate ${item.effectiveUntil}` : "sem fim informado"}</Text>
                  <Text style={styles.muted}>Fonte: {item.source || "pendente"} · Hash: {item.sourceHash || "pendente"}</Text>
                  <Text style={styles.body}>{item.content}</Text>
                </View>
                <Pill text={item.status} tone={item.status === "NOT_VERIFIED" ? "#b76e00" : "#067647"} />
              </View>
            ))}
          </View>
        ) : null}
      </Panel>
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
  form: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  input: { minHeight: 42, minWidth: 140, borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, color: "#101828", backgroundColor: "#ffffff" },
  topicInput: { minWidth: 180, flex: 1 },
  button: { minHeight: 42, justifyContent: "center", borderRadius: 8, paddingHorizontal: 14, backgroundColor: "#175cd3" },
  buttonText: { color: "#ffffff", fontWeight: "900" },
  ruleResult: { gap: 12, marginTop: 14 },
  ruleRow: { flexDirection: "row", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  error: { color: "#b42318", fontWeight: "800" }
});
