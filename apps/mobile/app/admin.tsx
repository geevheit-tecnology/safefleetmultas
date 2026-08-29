import { StyleSheet, Text, View } from "react-native";
import { AppShell } from "../src/ui/AppShell";
import { InfoCard, Panel, Pill } from "../src/ui/Primitives";

const roles = [
  { role: "PRESIDENT", permissions: "dashboard executivo" },
  { role: "DIRECTOR", permissions: "dashboard e gestao" },
  { role: "OPERATOR", permissions: "casos, documentos e tarefas" },
  { role: "LEGAL", permissions: "casos, legislacao e analise" },
  { role: "ADMIN", permissions: "usuarios, perfis e configuracoes" }
];

export default function AdminScreen() {
  return (
    <AppShell title="Administracao" subtitle="Organizacao, usuarios, perfis RBAC e configuracoes">
      <View style={styles.metrics}>
        <InfoCard label="Organizacoes" value="1" />
        <InfoCard label="Usuarios demo" value="3" />
        <InfoCard label="Perfis" value={String(roles.length)} />
      </View>
      <Panel title="Perfis e permissoes">
        {roles.map((item) => (
          <View key={item.role} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.title}>{item.role}</Text>
              <Text style={styles.muted}>{item.permissions}</Text>
            </View>
            <Pill text="RBAC" tone="#10243f" />
          </View>
        ))}
      </Panel>
      <Panel title="Seguranca">
        <Text style={styles.muted}>Tenant isolation e permissoes devem ser aplicados no backend/API, nao somente escondendo botoes no app.</Text>
      </Panel>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, borderTopColor: "#f2f4f7", borderTopWidth: 1 },
  flex: { flex: 1 },
  title: { color: "#101828", fontWeight: "900" },
  muted: { color: "#667085", fontSize: 12, marginTop: 3 }
});
