import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getSecuritySummary, type SecuritySummary } from "../src/api/client";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

export default function AdminScreen() {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSecuritySummary()
      .then(setSummary)
      .catch(() => setError("Nao foi possivel carregar seguranca e permissoes."));
  }, []);

  return (
    <AppShell title="Administracao" subtitle="Organizacao, usuarios, perfis RBAC e configuracoes">
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
            <ControlRow label="Tenant isolation" value={summary.controls.tenantIsolation} />
            <ControlRow label="Auditoria de mutacoes" value={summary.controls.mutationAudit} />
            <ControlRow label="Protecao do preview" value={summary.controls.deploymentProtection} tone="#b76e00" />
            <ControlRow label="Auth producao" value={summary.controls.productionAuth} tone="#b42318" />
            {summary.controls.privacy ? <ControlRow label="LGPD" value={summary.controls.privacy} /> : null}
          </Panel>

          <View style={styles.columns}>
            <Panel title="Usuarios">
              {summary.users.map((user) => (
                <View key={user.id} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.title}>{user.name}</Text>
                    <Text style={styles.muted}>{user.email}</Text>
                  </View>
                  <Pill text={user.role} tone="#10243f" />
                </View>
              ))}
            </Panel>

            <Panel title="Perfis">
              {summary.roles.map((role) => (
                <View key={role.id} style={styles.row}>
                  <View style={styles.flex}>
                    <Text style={styles.title}>{role.code}</Text>
                    <Text style={styles.muted}>{role.name}</Text>
                  </View>
                  <Pill text={`${role.permissionCount} permissoes`} tone="#175cd3" />
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
                <Pill text={item.role} tone="#067647" />
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
                <Pill text="APPEND-ONLY" tone="#067647" />
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
      <Pill text="STATUS" tone={tone} />
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
  error: { color: "#b42318", fontWeight: "800" }
});
