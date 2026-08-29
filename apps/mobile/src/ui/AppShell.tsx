import { Link, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const primaryNav = isWide ? navItems : navItems.slice(0, 5);

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
  shell: { flex: 1, flexDirection: "row", backgroundColor: "#f5f7fb" },
  sidebar: { width: 248, backgroundColor: "#ffffff", borderRightColor: "#e4e7ec", borderRightWidth: 1, padding: 16, gap: 18 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#10243f", alignItems: "center", justifyContent: "center" },
  brandTitle: { color: "#101828", fontSize: 16, fontWeight: "900" },
  brandSub: { color: "#667085", fontSize: 11, fontWeight: "600" },
  nav: { gap: 6 },
  navItem: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, textDecorationLine: "none" },
  navActive: { backgroundColor: "#10243f" },
  navContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  navText: { color: "#475467", fontWeight: "800", fontSize: 13 },
  navTextActive: { color: "#fff" },
  main: { flex: 1 },
  topbar: { minHeight: 88, backgroundColor: "#fff", borderBottomColor: "#e4e7ec", borderBottomWidth: 1, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  kicker: { color: "#667085", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  title: { color: "#101828", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#667085", marginTop: 2 },
  demoBadge: { backgroundColor: "#fff3cd", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  demoText: { color: "#8a5a00", fontWeight: "900", fontSize: 11 },
  content: { padding: 18, paddingBottom: 92, gap: 16, maxWidth: 1180, width: "100%", alignSelf: "center" },
  bottomNav: { height: 68, borderTopColor: "#e4e7ec", borderTopWidth: 1, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 6 },
  bottomItem: { flex: 1, textDecorationLine: "none" },
  bottomContent: { alignItems: "center", justifyContent: "center", gap: 3 },
  bottomText: { color: "#667085", fontSize: 10, fontWeight: "800" },
  bottomTextActive: { color: "#175cd3" }
});
