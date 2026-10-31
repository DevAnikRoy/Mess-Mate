import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProviders } from "../src/providers";
import { Toast } from "../src/toast";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.ink,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="join/[code]" options={{ title: "মেসে যোগ দিন", headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        </Stack>
        <Toast />
      </AppProviders>
    </SafeAreaProvider>
  );
}
