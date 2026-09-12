import { Link, router, usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { logout } from "../api/client";
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
  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={[styles.shell, { backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' } as any]}>
      {isWide ? (
        <View style={[styles.sidebar, { backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any]}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundImage: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' } as any]}>
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
        <View style={[styles.topbar, { backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any]}>
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
            <Pressable onPress={signOut} style={styles.logoutTop}>
              <MaterialCommunityIcons name="logout" size={17} color={tokens.colors.danger} />
              <Text style={styles.logoutText}>{t("logout")}</Text>
            </Pressable>
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
  sidebar: { width: 260, backgroundColor: tokens.colors.surface, borderRightColor: "rgba(0,0,0,0.03)", borderRightWidth: 1, padding: tokens.spacing.xl, gap: 24, elevation: 1, shadowColor: tokens.colors.brand, shadowOpacity: 0.02, shadowRadius: 20, shadowOffset: { width: 4, height: 0 } },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  logo: { width: 42, height: 42, borderRadius: tokens.radius.lg, backgroundColor: tokens.colors.brand, alignItems: "center", justifyContent: "center", shadowColor: tokens.colors.brand, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  brandTitle: { color: tokens.colors.text, fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  brandSub: { color: tokens.colors.muted, fontSize: tokens.typography.caption, fontWeight: "600", letterSpacing: 0.5 },
  nav: { gap: 8, flex: 1 },
  navItem: { borderRadius: tokens.radius.lg, paddingHorizontal: 12, paddingVertical: 12, textDecorationLine: "none" },
  navActive: { backgroundColor: tokens.colors.brand, shadowColor: tokens.colors.brand, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  navContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  navText: { color: "#64748b", fontWeight: "700", fontSize: 14, letterSpacing: 0.2 },
  navTextActive: { color: "#ffffff", fontWeight: "800" },
  main: { flex: 1 },
  topbar: { minHeight: 96, backgroundColor: "rgba(255,255,255,0.85)", borderBottomColor: "rgba(0,0,0,0.03)", borderBottomWidth: 1, paddingHorizontal: 28, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  kicker: { color: tokens.colors.primary, fontSize: tokens.typography.tiny, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 },
  heading: { flex: 1, minWidth: 0 },
  title: { color: tokens.colors.text, fontSize: 28, fontWeight: "900", flexShrink: 1, letterSpacing: -0.8 },
  subtitle: { color: tokens.colors.muted, marginTop: 4, flexShrink: 1, fontSize: 14 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  languageSwitch: { flexDirection: "row", backgroundColor: tokens.colors.surfaceMuted, borderColor: tokens.colors.border, borderWidth: 1, borderRadius: tokens.radius.md, padding: 4 },
  languageButton: { minWidth: 40, minHeight: 34, borderRadius: tokens.radius.md, alignItems: "center", justifyContent: "center" },
  languageButtonActive: { backgroundColor: tokens.colors.surface, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  languageText: { color: tokens.colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  languageTextActive: { color: tokens.colors.primary, fontWeight: "900" },
  logoutTop: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderColor: "transparent", borderWidth: 1, borderRadius: tokens.radius.md, paddingHorizontal: 16, backgroundColor: tokens.colors.dangerSoft, textDecorationLine: "none" },
  logoutText: { color: tokens.colors.danger, fontSize: 13, fontWeight: "800" },
  content: { padding: 28, paddingBottom: 120, gap: 24, maxWidth: 1280, width: "100%", alignSelf: "center" },
  bottomNav: { height: 80, borderTopColor: "rgba(0,0,0,0.05)", borderTopWidth: 1, backgroundColor: "rgba(255,255,255,0.95)", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 8, elevation: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  bottomItem: { flex: 1, textDecorationLine: "none" },
  bottomContent: { alignItems: "center", justifyContent: "center", gap: 4, minHeight: 60, borderRadius: tokens.radius.md },
  bottomText: { color: tokens.colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  bottomTextActive: { color: tokens.colors.primary, fontWeight: "900" }
});
