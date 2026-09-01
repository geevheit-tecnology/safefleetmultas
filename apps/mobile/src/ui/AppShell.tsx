import { Link, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { tokens } from "./tokens";

type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const navItems: NavItem[] = [
  { href: "/", label: "Central", icon: "view-dashboard-outline" },
  { href: "/cases", label: "Prontuarios", icon: "folder-text-outline" },
  { href: "/new-case", label: "Novo auto", icon: "camera-plus-outline" },
  { href: "/tasks", label: "Tarefas", icon: "checkbox-marked-circle-outline" },
  { href: "/legislation", label: "Legislacao", icon: "book-open-variant" },
  { href: "/radar", label: "Radar", icon: "radar" },
  { href: "/intelligence", label: "Inteligencia", icon: "chart-timeline-variant" },
  { href: "/reports", label: "Relatorios", icon: "file-chart-outline" },
  { href: "/admin", label: "Admin", icon: "shield-account-outline" }
];

const mobileNavItems: NavItem[] = [
  { href: "/", label: "Alertas", icon: "bell-alert-outline" },
  { href: "/tasks", label: "Acoes", icon: "checkbox-marked-circle-outline" },
  { href: "/cases", label: "Casos", icon: "folder-text-outline" },
  { href: "/new-case", label: "Documento", icon: "camera-plus-outline" },
  { href: "/cases", label: "Prazos", icon: "calendar-alert" }
];

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const primaryNav = isWide ? navItems : mobileNavItems;

  return (
    <View style={styles.shell}>
      {isWide ? (
        <View style={styles.sidebar}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <MaterialCommunityIcons name="shield-check" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.brandTitle}>ANTT Control</Text>
              <Text style={styles.brandSub}>risco regulatorio</Text>
            </View>
          </View>
          <View style={styles.nav}>
            {primaryNav.map((item) => <NavLink key={item.href} item={item} active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)} />)}
          </View>
        </View>
      ) : null}

      <View style={styles.main}>
        <View style={styles.topbar}>
          <View>
            <Text style={styles.kicker}>Transportadora Demo</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>DEMO</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        {!isWide ? (
          <View style={styles.bottomNav}>
            {primaryNav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href as never} style={styles.bottomItem}>
                  <View style={styles.bottomContent}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={active ? "#175cd3" : "#667085"} />
                    <Text style={[styles.bottomText, active && styles.bottomTextActive]}>{item.label}</Text>
                  </View>
                </Link>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href as never} style={[styles.navItem, active && styles.navActive]}>
      <View style={styles.navContent}>
        <MaterialCommunityIcons name={item.icon} size={18} color={active ? "#fff" : "#475467"} />
        <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: "row", backgroundColor: tokens.colors.background },
  sidebar: { width: 248, backgroundColor: tokens.colors.surface, borderRightColor: tokens.colors.border, borderRightWidth: 1, padding: tokens.spacing.lg, gap: 18 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.brand, alignItems: "center", justifyContent: "center" },
  brandTitle: { color: tokens.colors.text, fontSize: tokens.typography.section, fontWeight: "900" },
  brandSub: { color: tokens.colors.muted, fontSize: tokens.typography.tiny, fontWeight: "600" },
  nav: { gap: 6 },
  navItem: { borderRadius: tokens.radius.md, paddingHorizontal: 10, paddingVertical: 10, textDecorationLine: "none" },
  navActive: { backgroundColor: tokens.colors.brand },
  navContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  navText: { color: "#475467", fontWeight: "800", fontSize: 13 },
  navTextActive: { color: "#fff" },
  main: { flex: 1 },
  topbar: { minHeight: 88, backgroundColor: tokens.colors.surface, borderBottomColor: tokens.colors.border, borderBottomWidth: 1, paddingHorizontal: 22, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  kicker: { color: tokens.colors.muted, fontSize: tokens.typography.caption, fontWeight: "700", textTransform: "uppercase" },
  title: { color: tokens.colors.text, fontSize: tokens.typography.title, fontWeight: "900" },
  subtitle: { color: tokens.colors.muted, marginTop: 2 },
  demoBadge: { backgroundColor: "#fff3cd", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  demoText: { color: "#8a5a00", fontWeight: "900", fontSize: 11 },
  content: { padding: 20, paddingBottom: 96, gap: 16, maxWidth: 1180, width: "100%", alignSelf: "center" },
  bottomNav: { height: tokens.components.bottomNavHeight, borderTopColor: tokens.colors.border, borderTopWidth: 1, backgroundColor: tokens.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 6 },
  bottomItem: { flex: 1, textDecorationLine: "none" },
  bottomContent: { alignItems: "center", justifyContent: "center", gap: 3, minHeight: 54, borderRadius: 8 },
  bottomText: { color: "#667085", fontSize: 10, fontWeight: "800" },
  bottomTextActive: { color: "#175cd3" }
});
