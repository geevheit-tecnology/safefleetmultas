import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { Panel, Pill } from "../src/ui/Primitives";

export default function NewCaseScreen() {
  return (
    <AppShell title="Novo auto" subtitle="Entrada, OCR preparado e confirmacao humana antes de gravar dados criticos">
      <Panel title="Captura do documento">
        <View style={styles.uploadBox}>
          <Text style={styles.uploadTitle}>Fotografar ou anexar auto</Text>
          <Text style={styles.body}>PDF, JPG ou PNG. O arquivo sera enviado para storage S3 compativel quando a integracao estiver configurada.</Text>
          <Pill text="OCR MOCK · exige confirmacao humana" tone="#b76e00" />
        </View>
      </Panel>
      <Panel title="Dados iniciais">
        <View style={styles.formGrid}>
          {["Numero do auto", "Categoria", "Placa", "RNTRC", "Responsavel", "Valor estimado"].map((label) => (
            <View key={label} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput placeholder={label} style={styles.input} placeholderTextColor="#98a2b3" />
            </View>
          ))}
        </View>
      </Panel>
      <Panel title="Regras de seguranca">
        <Text style={styles.body}>Nenhuma legislacao, prazo ou dado extraido por IA deve ser aceito sem validacao humana. Fontes nao confirmadas ficam como NOT_VERIFIED.</Text>
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  uploadBox: { borderWidth: 1, borderColor: "#d0d5dd", borderStyle: "dashed", borderRadius: 8, padding: 22, gap: 10, backgroundColor: "#f9fafb" },
  uploadTitle: { color: "#101828", fontWeight: "900", fontSize: 18 },
  body: { color: "#667085", lineHeight: 21 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { minWidth: 240, flex: 1, gap: 6 },
  label: { color: "#344054", fontWeight: "800", fontSize: 12 },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 12, height: 44, color: "#101828", backgroundColor: "#fff" }
});
