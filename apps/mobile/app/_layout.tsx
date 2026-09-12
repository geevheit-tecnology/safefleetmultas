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
      {/* INJECTION DE FONTE PREMIUM E CSS GLOBAL PARA A WEB */}
      {typeof window !== "undefined" && (
        <style type="text/css">
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            * { font-family: 'Inter', sans-serif !important; }
            body { background-color: #f8fafc; }
            /* Esconde scrollbar para ficar com visual de app */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
          `}
        </style>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: "#f8fafc" },
          headerTintColor: "#0f172a",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#f8fafc" }
        }}
      />
    </LanguageProvider>
  );
}
