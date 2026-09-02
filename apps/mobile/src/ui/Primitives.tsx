import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useLanguage } from "../i18n";
import { tokens, type RiskTone, type StatusTone } from "./tokens";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function Button({ label, onPress, tone = "primary", disabled = false }: { label: string; onPress?: () => void; tone?: "primary" | "secondary" | "danger"; disabled?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, tone === "secondary" && styles.secondaryButton, tone === "danger" && styles.dangerButton, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, tone === "secondary" && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor={props.placeholderTextColor ?? "#98a2b3"} />;
}

export function InfoCard({ label, value, tone = "#101828" }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

export function Badge({ text, tone = tokens.colors.primary }: { text: string; tone?: string }) {
  return <Pill text={text} tone={tone} />;
}

export function StatusBadge({ status }: { status: string }) {
  const { codeLabel } = useLanguage();
  return <Pill text={codeLabel(status)} tone={tokens.status[status as StatusTone] ?? tokens.colors.primary} />;
}

export function RiskBadge({ level, score }: { level: string; score?: number }) {
  const { codeLabel } = useLanguage();
  return <Pill text={score === undefined ? codeLabel(level) : `${codeLabel(level)} ${score}`} tone={tokens.risk[level as RiskTone] ?? tokens.colors.primary} />;
}

export function EmptyState({ text }: { text: string }) {
  return <Text style={styles.muted}>{text}</Text>;
}

export function LoadingState({ text = "Carregando..." }: { text?: string }) {
  return <Text style={styles.muted}>{text}</Text>;
}

export function ErrorState({ text }: { text: string }) {
  return <Text style={styles.error}>{text}</Text>;
}

export function Pill({ text, tone = "#5c7fa8" }: { text: string; tone?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${tone}18` }]}>
      <Text style={[styles.pillText, { color: tone }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    borderColor: tokens.colors.border,
    borderWidth: tokens.elevation.border,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    shadowColor: "#101828",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }
  },
  panelHeader: { borderBottomWidth: 1, borderBottomColor: tokens.colors.border, paddingBottom: tokens.spacing.sm },
  panelTitle: { color: tokens.colors.text, fontSize: tokens.typography.section, fontWeight: "900" },
  button: { minHeight: tokens.components.controlHeight, justifyContent: "center", borderRadius: tokens.radius.md, paddingHorizontal: 14, backgroundColor: tokens.colors.primary },
  secondaryButton: { backgroundColor: tokens.colors.surface, borderWidth: 1, borderColor: tokens.colors.primary },
  dangerButton: { backgroundColor: tokens.colors.danger },
  buttonText: { color: "#ffffff", fontWeight: "900", textAlign: "center", fontSize: tokens.typography.caption },
  secondaryButtonText: { color: tokens.colors.primary },
  input: { borderWidth: 1, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, minHeight: tokens.components.controlHeight, paddingHorizontal: 12, color: tokens.colors.text, backgroundColor: tokens.colors.surface },
  info: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    borderWidth: tokens.elevation.border,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minWidth: tokens.components.cardMinWidth,
    flex: 1,
    minHeight: 92,
    justifyContent: "space-between",
    shadowColor: "#101828",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }
  },
  infoLabel: { color: tokens.colors.muted, fontSize: tokens.typography.caption, fontWeight: "800", lineHeight: 16, flexShrink: 1 },
  infoValue: { fontWeight: "900", fontSize: 22, lineHeight: 27, marginTop: 10, flexShrink: 1 },
  muted: { color: tokens.colors.muted, fontSize: tokens.typography.caption, flexShrink: 1 },
  error: { color: tokens.colors.danger, fontWeight: "800" },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", maxWidth: "100%" },
  pillText: { fontWeight: "900", fontSize: tokens.typography.tiny, flexShrink: 1 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 }
});
