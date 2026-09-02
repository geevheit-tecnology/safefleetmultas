import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createCase } from "../src/api/client";
import { useLanguage } from "../src/i18n";
import { AppShell } from "../src/ui/AppShell";
import { Panel, Pill } from "../src/ui/Primitives";

export default function NewCaseScreen() {
  const [infractionNumber, setInfractionNumber] = useState("");
  const [category, setCategory] = useState("Transporte");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [rntrc, setRntrc] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { codeLabel } = useLanguage();

  const submit = async () => {
    if (!infractionNumber.trim() || !category.trim()) {
      setError("Informe o numero do auto e a categoria.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createCase({
        infractionNumber,
        category,
        subcategory,
        description,
        vehiclePlate,
        rntrc,
        amount: Number(amount.replace(",", ".")) || 0
      });
      router.replace(`/cases/${created.id}`);
    } catch {
      setError("Nao foi possivel gravar o prontuario agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Nova multa" subtitle="Entrada estruturada para qualquer orgao fiscalizador, com confirmacao humana antes de gravar dados criticos">
      <Panel title="Captura do documento">
        <View style={styles.uploadBox}>
          <Text style={styles.uploadTitle}>Fotografar ou anexar documento</Text>
          <Text style={styles.body}>PDF, JPG ou PNG. A integracao de armazenamento fica preparada para o proximo ciclo.</Text>
          <Pill text="OCR preparado · exige confirmacao humana" tone="#b76e00" />
        </View>
      </Panel>

      <Panel title="Dados iniciais">
        <View style={styles.formGrid}>
          <Field label="Numero do documento" value={infractionNumber} onChangeText={setInfractionNumber} placeholder="AI-000000/2026" />
          <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Transporte, fiscal, trabalhista, transito" />
          <Field label="Subcategoria" value={subcategory} onChangeText={setSubcategory} placeholder="Descricao operacional" />
          <Field label="Placa" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="ABC-1D23" autoCapitalize="characters" />
          <Field label="RNTRC" value={rntrc} onChangeText={setRntrc} placeholder="00000000" keyboardType="numeric" />
          <Field label="Valor estimado" value={amount} onChangeText={setAmount} placeholder="1500,00" keyboardType="decimal-pad" />
        </View>
        <View style={styles.descriptionField}>
          <Text style={styles.label}>Resumo do fato</Text>
          <TextInput
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Descreva o fato, rota, documento citado e observacoes relevantes."
            style={[styles.input, styles.textArea]}
            placeholderTextColor="#98a2b3"
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, saving && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{saving ? "Gravando..." : "Criar prontuario"}</Text>
          </Pressable>
        </View>
      </Panel>

      <Panel title="Regras de seguranca">
        <Text style={styles.body}>Nenhuma norma, prazo ou dado extraido por IA deve ser aceito sem validacao humana. Fontes nao confirmadas ficam como {codeLabel("NOT_VERIFIED")}.</Text>
      </Panel>
    </AppShell>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "numeric" | "decimal-pad";
};

function Field({ label, value, onChangeText, placeholder, autoCapitalize, keyboardType }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        placeholderTextColor="#98a2b3"
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  uploadBox: { borderWidth: 1, borderColor: "#d0d5dd", borderStyle: "dashed", borderRadius: 8, padding: 22, gap: 10, backgroundColor: "#f9fafb" },
  uploadTitle: { color: "#101828", fontWeight: "900", fontSize: 18 },
  body: { color: "#667085", lineHeight: 21 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { minWidth: 240, flex: 1, gap: 6 },
  descriptionField: { gap: 6, marginTop: 12 },
  label: { color: "#344054", fontWeight: "800", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, minHeight: 44, color: "#101828", backgroundColor: "#fff" },
  textArea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  error: { color: "#b42318", fontWeight: "800", marginTop: 12 },
  actions: { alignItems: "flex-end", marginTop: 16 },
  primaryButton: { backgroundColor: "#5c7fa8", borderRadius: 8, minHeight: 44, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 }
});
