import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme";

function TabIcon({ name, color, size }: { name: React.ComponentProps<typeof Ionicons>["name"]; color: unknown; size: number }) {
  return <Ionicons name={name} color={typeof color === "string" ? color : colors.muted} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { fontWeight: "800", fontSize: 18 },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopWidth: 0,
          elevation: 12,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "হোম",
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "মিল",
          tabBarIcon: ({ color, size }) => <TabIcon name="restaurant" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bazaar"
        options={{
          title: "বাজার",
          tabBarIcon: ({ color, size }) => <TabIcon name="basket" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "রিপোর্ট",
          tabBarIcon: ({ color, size }) => <TabIcon name="stats-chart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "আরও",
          tabBarIcon: ({ color, size }) => <TabIcon name="ellipsis-horizontal" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
