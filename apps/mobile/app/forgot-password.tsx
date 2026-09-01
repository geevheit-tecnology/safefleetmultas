import { Link } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { tokens } from "../src/ui/tokens";

export default function ForgotPasswordScreen() {
  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.body}>Informe o e-mail cadastrado. O envio real depende do backend de autenticacao.</Text>
        <TextInput style={styles.input} placeholder="usuario@empresa.com.br" placeholderTextColor="#98a2b3" autoCapitalize="none" />
        <Link href="/login" style={styles.button}>
          <Text style={styles.buttonText}>Enviar instrucao</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tokens.colors.background, alignItems: "center", justifyContent: "center", padding: 20 },
  panel: { width: "100%", maxWidth: 420, backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.colors.border, padding: 22, gap: 14 },
  title: { color: tokens.colors.text, fontSize: tokens.typography.title, fontWeight: "900" },
  body: { color: tokens.colors.muted, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, height: 44, paddingHorizontal: 12, color: tokens.colors.text },
  button: { backgroundColor: tokens.colors.brand, borderRadius: tokens.radius.md, paddingVertical: 13, textDecorationLine: "none" },
  buttonText: { color: "#fff", fontWeight: "900", textAlign: "center" }
});
