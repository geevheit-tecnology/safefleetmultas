import { Link } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { tokens } from "../src/ui/tokens";

export default function LoginScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="shield-check" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.title}>ANTT Control</Text>
            <Text style={styles.subtitle}>Acesso regulatorio multiempresa</Text>
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
        <Text style={styles.note}>Demo local. Autenticacao real deve ser validada no backend com RBAC e tenant isolation.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.background, alignItems: "center", justifyContent: "center", padding: 20 },
  panel: { width: "100%", maxWidth: 420, backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.colors.border, padding: 22, gap: 14 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  logo: { width: 42, height: 42, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.brand, alignItems: "center", justifyContent: "center" },
  title: { color: tokens.colors.text, fontSize: tokens.typography.title, fontWeight: "900" },
  subtitle: { color: tokens.colors.muted, fontSize: 13 },
  field: { gap: 6 },
  label: { color: "#344054", fontWeight: "800", fontSize: 12 },
  input: { borderWidth: 1, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, height: 44, paddingHorizontal: 12, color: tokens.colors.text },
  button: { backgroundColor: tokens.colors.brand, borderRadius: tokens.radius.md, paddingVertical: 13, textDecorationLine: "none", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "900", textAlign: "center" },
  links: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  link: { color: tokens.colors.primary, fontWeight: "800", textDecorationLine: "none" },
  note: { color: tokens.colors.muted, fontSize: 12, lineHeight: 18 }
});
