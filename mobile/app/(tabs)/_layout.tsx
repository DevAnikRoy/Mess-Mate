import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, BootState, MoreMenu } from "../../src/chrome";
import { IconBag, IconBill, IconHome, IconMeal, IconReport } from "../../src/icons";
import { colors } from "../../src/theme";

function tint(color: unknown) {
  return typeof color === "string" ? color : colors.muted;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);
  const bar = 58 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <AppHeader />
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.purple,
            tabBarInactiveTintColor: colors.muted,
            tabBarHideOnKeyboard: true,
            tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
            tabBarStyle: {
              backgroundColor: colors.paper,
              borderTopWidth: 1,
              borderTopColor: "#E7E0F4",
              elevation: 0,
              height: bar,
              paddingTop: 6,
              paddingBottom: insets.bottom + 6,
            },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "হোম", tabBarIcon: ({ color }) => <IconHome color={tint(color)} /> }} />
          <Tabs.Screen name="meals" options={{ title: "মিল", tabBarIcon: ({ color }) => <IconMeal color={tint(color)} /> }} />
          <Tabs.Screen name="bazaar" options={{ title: "বাজার", tabBarIcon: ({ color }) => <IconBag color={tint(color)} /> }} />
          <Tabs.Screen name="report" options={{ title: "রিপোর্ট", tabBarIcon: ({ color }) => <IconReport color={tint(color)} /> }} />
          <Tabs.Screen
            name="more"
            listeners={{
              tabPress: (event) => {
                event.preventDefault();
                setMore((value) => !value);
              },
            }}
            options={{ title: "আরও", tabBarIcon: ({ color }) => <IconBill color={more ? colors.purple : tint(color)} /> }}
          />
          <Tabs.Screen name="bills" options={{ href: null }} />
          <Tabs.Screen name="duties" options={{ href: null }} />
          <Tabs.Screen name="mess" options={{ href: null }} />
          <Tabs.Screen name="account" options={{ href: null }} />
          <Tabs.Screen name="members/[id]" options={{ href: null }} />
        </Tabs>
        <BootState />
        {more && <MoreMenu bottom={bar + 8} onClose={() => setMore(false)} />}
      </View>
    </View>
  );
}
