import { Link } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { tokens } from "../src/ui/tokens";

export default function LoginScreen() {
  const greeting = getGreeting();

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.presentation}>
          <View style={styles.mark}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#fff" />
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroTitle}>SafeFleet</Text>
          <Text style={styles.heroText}>Gestao executiva de multas, prazos, documentos e risco operacional para frotas.</Text>
          <View style={styles.signalList}>
            <Signal text="Triagem inteligente" />
            <Signal text="Linha de vida auditavel" />
            <Signal text="Prazos criticos no radar" />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <MaterialCommunityIcons name="lock-check-outline" size={22} color="#9f2f2f" />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.title}>SafeFleet</Text>
              <Text style={styles.subtitle}>Acesso seguro ao painel operacional</Text>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={styles.input} placeholder="usuario@empresa.com.br" placeholderTextColor="#98a2b3" autoCapitalize="none" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} placeholder="senha" placeholderTextColor="#98a2b3" secureTextEntry />
          </View>
          <Link href="/" style={styles.button}>
            <Text style={styles.buttonText}>Entrar</Text>
          </Link>
          <View style={styles.links}>
            <Link href="/forgot-password" style={styles.link}>Recuperar senha</Link>
            <Link href="/first-access" style={styles.link}>Primeiro acesso</Link>
          </View>
          <Text style={styles.note}>Ambiente de acesso seguro com perfis, auditoria e separacao por empresa.</Text>
        </View>
      </View>
    </View>
  );
}

function Signal({ text }: { text: string }) {
  return (
    <View style={styles.signal}>
      <MaterialCommunityIcons name="check-circle-outline" size={16} color="#17745b" />
      <Text style={styles.signalText}>{text}</Text>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f6f8", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 920, backgroundColor: tokens.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: "#e3e6eb", padding: 0, overflow: "hidden", flexDirection: "row", flexWrap: "wrap", shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  presentation: { flex: 1.15, minWidth: 320, backgroundColor: "#fbfbfc", borderRightColor: "#edf0f4", borderRightWidth: 1, padding: 28, justifyContent: "center", gap: 12 },
  mark: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#9f2f2f", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  greeting: { color: "#9f2f2f", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  heroTitle: { color: "#111827", fontSize: 32, lineHeight: 38, fontWeight: "900" },
  heroText: { color: "#5f6673", fontSize: 15, lineHeight: 23, maxWidth: 420 },
  signalList: { gap: 8, marginTop: 8 },
  signal: { flexDirection: "row", alignItems: "center", gap: 8 },
  signalText: { color: "#344054", fontWeight: "800", fontSize: 13 },
  panel: { flex: 0.85, minWidth: 320, padding: 28, gap: 14, justifyContent: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  brandText: { flex: 1, minWidth: 0 },
  logo: { width: 42, height: 42, borderRadius: tokens.radius.md, backgroundColor: "#fff1f1", borderColor: "#f0c7c7", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { color: tokens.colors.text, fontSize: tokens.typography.title, fontWeight: "900" },
  subtitle: { color: tokens.colors.muted, fontSize: 13 },
  field: { gap: 6 },
  label: { color: "#344054", fontWeight: "800", fontSize: 12 },
  input: { borderWidth: 1, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, height: 44, paddingHorizontal: 12, color: tokens.colors.text },
  button: { backgroundColor: "#9f2f2f", borderRadius: tokens.radius.md, paddingVertical: 13, textDecorationLine: "none", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "900", textAlign: "center" },
  links: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  link: { color: tokens.colors.primary, fontWeight: "800", textDecorationLine: "none" },
  note: { color: tokens.colors.muted, fontSize: 12, lineHeight: 18 }
});
