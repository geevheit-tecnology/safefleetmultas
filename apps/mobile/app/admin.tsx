import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { deleteUser, getSecuritySummary, saveUser, type SecuritySummary } from "../src/api/client";
import { useLanguage } from "../src/i18n";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function AdminScreen() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [saving, setSaving] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const { codeLabel } = useLanguage();
  const canCreateUser = name.trim().length >= 3 && email.includes("@") && password.length >= 8 && !saving;

  const loadSummary = () => {
    void getSecuritySummary()
      .then(setSummary)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar seguranca e permissoes."));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const submitUser = async () => {
    if (!canCreateUser) {
      setError("Informe nome, e-mail valido e senha inicial com pelo menos 8 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveUser({ name, email, password, role, mode: "create_user" });
      setName("");
      setEmail("");
      setPassword("");
      setRole("OPERATOR");
      loadSummary();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nao foi possivel salvar usuario.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (userId: string) => {
    const confirmed = typeof window === "undefined" ? true : window.confirm("Excluir este usuario? Esta acao remove o acesso dele ao SafeFleet.");
    if (!confirmed) return;
    setRemovingUserId(userId);
    setError(null);
    try {
      await deleteUser(userId);
      loadSummary();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nao foi possivel excluir usuario.");
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <AppShell title="Administracao" subtitle="Organizacao, usuarios, perfis de acesso e governanca">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!summary ? <Text style={styles.muted}>Carregando seguranca...</Text> : null}
      {summary ? (
        <>
          <View style={styles.metrics}>
            <InfoCard label="Organizacoes" value={summary.organization ? "1" : "0"} />
            <InfoCard label="Usuarios" value={String(summary.users.length)} />
            <InfoCard label="Perfis" value={String(summary.roles.length)} />
            <InfoCard label="Permissoes" value={String(summary.permissions.length)} />
          </View>

          <Panel title="Controles ativos">
            <ControlRow label="Separacao por empresa" value={summary.controls.tenantIsolation} />
            <ControlRow label="Auditoria de mutacoes" value={summary.controls.mutationAudit} />
            <ControlRow label="Protecao do preview" value={summary.controls.deploymentProtection} tone="#b76e00" />
            <ControlRow label="Autenticacao" value={summary.controls.productionAuth} tone="#b42318" />
            {summary.controls.privacy ? <ControlRow label="LGPD" value={summary.controls.privacy} /> : null}
          </Panel>

          <View style={styles.columns}>
            <Panel title="Usuarios">
              <Text style={styles.muted}>Somente ADMIN pode criar ou excluir usuarios. O primeiro acesso cria o ADMIN inicial; depois esta tela assume o controle.</Text>
              <View style={styles.form}>
                <TextInput value={name} onChangeText={setName} style={[styles.input, styles.nameInput]} placeholder="Nome completo" placeholderTextColor="#98a2b3" />
                <TextInput value={email} onChangeText={setEmail} style={[styles.input, styles.emailInput]} placeholder="email@empresa.com" placeholderTextColor="#98a2b3" autoCapitalize="none" keyboardType="email-address" />
                <TextInput value={password} onChangeText={setPassword} style={[styles.input, styles.nameInput]} placeholder="Senha inicial" placeholderTextColor="#98a2b3" secureTextEntry />
                <View style={styles.roleBar}>
                  {["OPERATOR", "LEGAL", "MANAGER", "VIEWER", "ADMIN"].map((option) => (
                    <Pressable key={option} onPress={() => setRole(option)} style={({ pressed }) => [styles.roleButton, role === option && styles.roleButtonActive, pressed && styles.pressed]}>
                      <Text style={[styles.roleButtonText, role === option && styles.roleButtonTextActive]}>{codeLabel(option)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable disabled={!canCreateUser} onPress={submitUser} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, !canCreateUser && styles.disabled]}>
                  <Text style={styles.primaryButtonText}>{saving ? "Salvando..." : "Criar usuario"}</Text>
                </Pressable>
              </View>
              {summary.users.map((user) => (
                <View key={user.id} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.title}>{user.name}</Text>
                    <Text style={styles.muted}>{user.email}</Text>
                  </View>
                  <Pill text={codeLabel(user.role)} tone="#405978" />
                  <Pressable disabled={removingUserId === user.id} onPress={() => removeUser(user.id)} style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed, removingUserId === user.id && styles.disabled]}>
                    <Text style={styles.dangerButtonText}>{removingUserId === user.id ? "Excluindo..." : "Excluir"}</Text>
                  </Pressable>
                </View>
              ))}
            </Panel>

            <Panel title="Perfis">
              {summary.roles.map((role) => (
                <View key={role.id} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.title}>{codeLabel(role.code)}</Text>
                    <Text style={styles.muted}>{role.name}</Text>
                  </View>
                  <Pill text={`${role.permissionCount} permissoes`} tone="#5c7fa8" />
                </View>
              ))}
            </Panel>
          </View>

          <Panel title="Matriz de permissoes">
            {summary.permissions.map((item) => (
              <View key={`${item.role}-${item.permission}`} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.permission}</Text>
                  <Text style={styles.muted}>{item.description}</Text>
                </View>
                <Pill text={codeLabel(item.role)} tone="#067647" />
              </View>
            ))}
          </Panel>

          <Panel title="Auditoria">
            {(summary.audit ?? []).length === 0 ? <Text style={styles.muted}>Nenhum registro de auditoria carregado.</Text> : null}
            {(summary.audit ?? []).map((item) => (
              <View key={`${item.action}-${item.entity}-${item.createdAt}`} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.action}</Text>
                  <Text style={styles.muted}>{item.entity} · {item.createdAt} · user-agent {item.userAgent}</Text>
                </View>
                <Pill text="Auditavel" tone="#067647" />
              </View>
            ))}
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}

function ControlRow({ label, value, tone = "#067647" }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.muted}>{value}</Text>
      </View>
      <Pill text="Ativo" tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  title: { color: "#101828", fontWeight: "900" },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 },
  error: { color: "#b42318", fontWeight: "800" },
  form: { gap: 10, paddingTop: 12 },
  input: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, minHeight: 42, paddingHorizontal: 12, color: "#101828", backgroundColor: "#fff" },
  nameInput: { minWidth: 220 },
  emailInput: { minWidth: 260 },
  roleBar: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleButton: { borderWidth: 1, borderColor: "#d0d5dd", borderRadius: 8, paddingHorizontal: 10, minHeight: 34, justifyContent: "center", backgroundColor: "#fff" },
  roleButtonActive: { borderColor: "#5c7fa8", backgroundColor: "#f3f7fb" },
  roleButtonText: { color: "#344054", fontSize: 12, fontWeight: "900" },
  roleButtonTextActive: { color: "#405978" },
  primaryButton: { alignSelf: "flex-start", borderRadius: 8, minHeight: 38, backgroundColor: "#5c7fa8", justifyContent: "center", paddingHorizontal: 14 },
  primaryButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  dangerButton: { borderRadius: 8, minHeight: 34, borderWidth: 1, borderColor: "#f3b6b6", backgroundColor: "#fff7f7", justifyContent: "center", paddingHorizontal: 12 },
  dangerButtonText: { color: "#b42318", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 }
});
