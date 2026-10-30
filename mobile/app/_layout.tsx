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
          <Stack.Screen name="join/[code]" options={{ title: "মেসে যোগ দিন" }} />
          <Stack.Screen name="bills" options={{ title: "ঘরের খরচ" }} />
          <Stack.Screen name="duties" options={{ title: "ডিউটি" }} />
          <Stack.Screen name="mess" options={{ title: "মেস ও সদস্য" }} />
          <Stack.Screen name="account" options={{ title: "প্রোফাইল" }} />
          <Stack.Screen name="members/[id]" options={{ title: "সদস্য" }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        </Stack>
        <Toast />
      </AppProviders>
    </SafeAreaProvider>
  );
}
