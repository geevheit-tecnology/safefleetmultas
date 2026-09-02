import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { saveUser } from "../src/api/client";
import { tokens } from "../src/ui/tokens";

export default function FirstAccessScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveUser({ name, email, password, role: "ADMIN", mode: "first_admin" });
      setMessage("Administrador criado. Proximos usuarios devem ser cadastrados pela tela Admin.");
      setTimeout(() => router.replace("/login"), 700);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Nao foi possivel criar o primeiro administrador.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <Text style={styles.title}>Primeiro acesso</Text>
        <Text style={styles.body}>O primeiro acesso cria obrigatoriamente o ADMIN da organizacao. Depois disso, somente ADMIN pode incluir ou excluir usuarios.</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nome do administrador" placeholderTextColor="#98a2b3" />
        <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="email@empresa.com" placeholderTextColor="#98a2b3" autoCapitalize="none" keyboardType="email-address" />
        <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Senha inicial" placeholderTextColor="#98a2b3" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [styles.button, pressed && styles.pressed, saving && styles.disabled]}>
          <Text style={styles.buttonText}>{saving ? "Criando..." : "Criar ADMIN"}</Text>
        </Pressable>
        <Link href="/login" style={styles.link}>Voltar ao login</Link>
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
  buttonText: { color: "#fff", fontWeight: "900", textAlign: "center" },
  link: { color: tokens.colors.brand, fontWeight: "800", textAlign: "center", textDecorationLine: "none" },
  error: { color: "#b42318", fontWeight: "800" },
  success: { color: "#067647", fontWeight: "800" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 }
});
