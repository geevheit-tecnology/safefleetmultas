import { Link, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage, type MessageKey } from "../i18n";
import { tokens } from "./tokens";

type NavItem = {
  href: string;
  labelKey: MessageKey;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const navItems: NavItem[] = [
  { href: "/", labelKey: "navCentral", icon: "view-dashboard-outline" },
  { href: "/cases", labelKey: "navRecords", icon: "folder-text-outline" },
  { href: "/new-case", labelKey: "navNewFine", icon: "camera-plus-outline" },
  { href: "/tasks", labelKey: "navTasks", icon: "checkbox-marked-circle-outline" },
  { href: "/legislation", labelKey: "navLegislation", icon: "book-open-variant" },
  { href: "/radar", labelKey: "navRadar", icon: "radar" },
  { href: "/intelligence", labelKey: "navIntelligence", icon: "chart-timeline-variant" },
  { href: "/reports", labelKey: "navReports", icon: "file-chart-outline" },
  { href: "/admin", labelKey: "navAdmin", icon: "shield-account-outline" }
];

const mobileNavItems: NavItem[] = [
  { href: "/", labelKey: "navAlerts", icon: "bell-alert-outline" },
  { href: "/tasks", labelKey: "navActions", icon: "checkbox-marked-circle-outline" },
  { href: "/cases", labelKey: "navCases", icon: "folder-text-outline" },
  { href: "/new-case", labelKey: "navDocument", icon: "camera-plus-outline" },
  { href: "/cases", labelKey: "navDeadlines", icon: "calendar-alert" }
];

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { language, setLanguage, t } = useLanguage();
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
              <Text style={styles.brandTitle}>SafeFleet</Text>
              <Text style={styles.brandSub}>{t("brandSub")}</Text>
            </View>
          </View>
          <View style={styles.nav}>
            {primaryNav.map((item) => <NavLink key={`${item.href}-${item.labelKey}`} item={item} active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)} />)}
          </View>
        </View>
      ) : null}

      <View style={styles.main}>
        <View style={styles.topbar}>
          <View style={styles.heading}>
            <Text style={styles.kicker}>{t("organization")}</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.topActions}>
            <View style={styles.languageSwitch}>
              {(["pt", "en"] as const).map((item) => (
                <Pressable key={item} onPress={() => setLanguage(item)} style={[styles.languageButton, language === item && styles.languageButtonActive]}>
                  <Text style={[styles.languageText, language === item && styles.languageTextActive]}>{item.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Link href="/login" style={styles.logoutTop}>
              <MaterialCommunityIcons name="logout" size={17} color={tokens.colors.danger} />
              <Text style={styles.logoutText}>{t("logout")}</Text>
            </Link>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        {!isWide ? (
          <View style={styles.bottomNav}>
            {primaryNav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={`${item.href}-${item.labelKey}`} href={item.href as never} style={styles.bottomItem}>
                  <View style={styles.bottomContent}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={active ? tokens.colors.primary : "#667085"} />
                    <Text style={[styles.bottomText, active && styles.bottomTextActive]}>{t(item.labelKey)}</Text>
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
  const { t } = useLanguage();
  return (
    <Link href={item.href as never} style={[styles.navItem, active && styles.navActive]}>
      <View style={styles.navContent}>
        <MaterialCommunityIcons name={item.icon} size={18} color={active ? "#fff" : "#475467"} />
        <Text style={[styles.navText, active && styles.navTextActive]}>{t(item.labelKey)}</Text>
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
  nav: { gap: 6, flex: 1 },
  navItem: { borderRadius: tokens.radius.md, paddingHorizontal: 10, paddingVertical: 10, textDecorationLine: "none" },
  navActive: { backgroundColor: tokens.colors.brand },
  navContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  navText: { color: "#475467", fontWeight: "800", fontSize: 13 },
  navTextActive: { color: "#fff" },
  main: { flex: 1 },
  topbar: { minHeight: 88, backgroundColor: tokens.colors.surface, borderBottomColor: tokens.colors.border, borderBottomWidth: 1, paddingHorizontal: 22, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  kicker: { color: tokens.colors.muted, fontSize: tokens.typography.caption, fontWeight: "700", textTransform: "uppercase" },
  heading: { flex: 1, minWidth: 0 },
  title: { color: tokens.colors.text, fontSize: tokens.typography.title, fontWeight: "900", flexShrink: 1 },
  subtitle: { color: tokens.colors.muted, marginTop: 2, flexShrink: 1 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  languageSwitch: { flexDirection: "row", backgroundColor: "#edf2f7", borderColor: tokens.colors.border, borderWidth: 1, borderRadius: 8, padding: 3 },
  languageButton: { minWidth: 34, minHeight: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  languageButtonActive: { backgroundColor: tokens.colors.surface },
  languageText: { color: tokens.colors.muted, fontSize: 11, fontWeight: "900" },
  languageTextActive: { color: tokens.colors.brand },
  logoutTop: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderColor: "#f0c7c7", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, backgroundColor: tokens.colors.dangerSoft, textDecorationLine: "none" },
  logoutText: { color: tokens.colors.danger, fontSize: 12, fontWeight: "900", lineHeight: 16 },
  content: { padding: 20, paddingBottom: 96, gap: 16, maxWidth: 1180, width: "100%", alignSelf: "center" },
  bottomNav: { height: tokens.components.bottomNavHeight, borderTopColor: tokens.colors.border, borderTopWidth: 1, backgroundColor: tokens.colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 6 },
  bottomItem: { flex: 1, textDecorationLine: "none" },
  bottomContent: { alignItems: "center", justifyContent: "center", gap: 3, minHeight: 54, borderRadius: 8 },
  bottomText: { color: "#667085", fontSize: 10, fontWeight: "800" },
  bottomTextActive: { color: tokens.colors.primary }
});
