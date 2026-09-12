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
      style={({ pressed }) => [styles.button, { backgroundImage: tone === "primary" ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : undefined } as any, tone === "secondary" && styles.secondaryButton, tone === "danger" && styles.dangerButton, pressed && styles.pressed, disabled && styles.disabled]}
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
    backgroundColor: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: tokens.radius.lg,
    borderColor: "rgba(255,255,255,0.6)",
    borderWidth: tokens.elevation.border,
    padding: tokens.spacing.xl,
    gap: tokens.spacing.md,
    shadowColor: tokens.colors.brand,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2
  } as any,
  panelHeader: { borderBottomWidth: 1, borderBottomColor: tokens.colors.border, paddingBottom: tokens.spacing.md },
  panelTitle: { color: tokens.colors.text, fontSize: tokens.typography.section, fontWeight: "900", letterSpacing: -0.5 },
  button: { minHeight: 46, justifyContent: "center", borderRadius: tokens.radius.lg, paddingHorizontal: 18, backgroundColor: tokens.colors.primary, shadowColor: tokens.colors.primary, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  secondaryButton: { backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: tokens.colors.borderStrong, shadowOpacity: 0 },
  dangerButton: { backgroundColor: tokens.colors.danger, shadowColor: tokens.colors.danger },
  buttonText: { color: "#ffffff", fontWeight: "800", textAlign: "center", fontSize: tokens.typography.body, letterSpacing: 0.2 },
  secondaryButtonText: { color: tokens.colors.text },
  input: { borderWidth: 1, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, minHeight: 46, paddingHorizontal: 14, color: tokens.colors.text, backgroundColor: "rgba(255,255,255,0.8)" },
  info: {
    backgroundColor: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    borderRadius: tokens.radius.lg,
    borderWidth: tokens.elevation.border,
    borderColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minWidth: tokens.components.cardMinWidth,
    flex: 1,
    minHeight: 100,
    justifyContent: "space-between",
    shadowColor: tokens.colors.brand,
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  } as any,
  infoLabel: { color: tokens.colors.muted, fontSize: tokens.typography.caption, fontWeight: "700", lineHeight: 18, flexShrink: 1, letterSpacing: 0.3 },
  infoValue: { fontWeight: "900", fontSize: 26, lineHeight: 32, marginTop: 12, flexShrink: 1, letterSpacing: -0.5 },
  muted: { color: tokens.colors.muted, fontSize: tokens.typography.caption, flexShrink: 1 },
  error: { color: tokens.colors.danger, fontWeight: "800" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start", maxWidth: "100%" },
  pillText: { fontWeight: "900", fontSize: tokens.typography.tiny, flexShrink: 1, letterSpacing: 0.5 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 }
});
