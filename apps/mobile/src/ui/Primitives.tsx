import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function InfoCard({ label, value, tone = "#101828" }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.infoValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

export function Pill({ text, tone = "#175cd3" }: { text: string; tone?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${tone}18` }]}>
      <Text style={[styles.pillText, { color: tone }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#fff", borderRadius: 8, borderColor: "#e4e7ec", borderWidth: 1, padding: 16, gap: 10 },
  panelTitle: { color: "#101828", fontSize: 16, fontWeight: "900" },
  info: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e4e7ec", padding: 14, minWidth: 160, flex: 1 },
  infoValue: { fontWeight: "900", fontSize: 19, marginTop: 4 },
  muted: { color: "#667085", fontSize: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start" },
  pillText: { fontWeight: "900", fontSize: 11 }
});
