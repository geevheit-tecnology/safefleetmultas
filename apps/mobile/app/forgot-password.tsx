import { Link } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";

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
  page: { flex: 1, backgroundColor: "#f5f7fb", alignItems: "center", justifyContent: "center", padding: 20 },
  panel: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4e7ec", padding: 22, gap: 14 },
  title: { color: "#101828", fontSize: 24, fontWeight: "900" },
  body: { color: "#667085", lineHeight: 20 },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, height: 44, paddingHorizontal: 12, color: "#101828" },
  button: { backgroundColor: "#10243f", borderRadius: 8, paddingVertical: 13, textDecorationLine: "none" },
  buttonText: { color: "#fff", fontWeight: "900", textAlign: "center" }
});
