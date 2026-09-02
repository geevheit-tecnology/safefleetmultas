import { Stack } from "expo-router";
import { LanguageProvider } from "../src/i18n";

export default function RootLayout() {
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
