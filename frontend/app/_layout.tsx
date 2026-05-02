import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  // Changed from (tabs) to (admin) since we renamed the folder!
  anchor: "(admin)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Your Login screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* --- THE FIX: Hiding headers for both Admin and User zones --- */}
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="(user)" options={{ headerShown: false }} />

        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
