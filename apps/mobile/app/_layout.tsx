import { Stack, router, usePathname } from "expo-router";
import { useEffect } from "react";
import { LanguageProvider } from "../src/i18n";
import { getCurrentUser } from "../src/api/client";

const publicRoutes = new Set(["/login", "/first-access", "/forgot-password"]);

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    const isPublicRoute = publicRoutes.has(pathname);
    void getCurrentUser().then((user) => {
      if (!active) return;
      if (!user && !isPublicRoute) {
        router.replace("/login");
      } else if (user && isPublicRoute) {
        router.replace("/");
      }
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <LanguageProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: "#eef4fb" },
          headerTintColor: "#26364f",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#f6f8fb" }
        }}
      />
    </LanguageProvider>
  );
}
