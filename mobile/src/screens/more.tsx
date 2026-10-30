import { Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createClient } from "../lib/supabase";
import { colors } from "../theme";
import { Group, Page, Row, Screen } from "../ui";

const items = [
  { href: "/bills", label: "ঘরের খরচ", hint: "ভাড়া, বিদ্যুৎ, গ্যাস", icon: "home-outline" as const },
  { href: "/duties", label: "ডিউটি", hint: "বাথরুম ও অন্য পালা", icon: "checkbox-outline" as const },
  { href: "/mess", label: "মেস ও সদস্য", hint: "ইনভাইট কোড, সেটিংস", icon: "people-outline" as const },
  { href: "/account", label: "প্রোফাইল", hint: "নাম ও অ্যাকাউন্ট", icon: "person-outline" as const },
];

export function MoreScreen() {
  function leave() {
    Alert.alert("বের হবেন?", "আবার ঢুকতে ইমেইল বা গুগল লাগবে।", [
      { text: "না", style: "cancel" },
      {
        text: "বের হন",
        style: "destructive",
        onPress: async () => {
          const supabase = createClient();
          if (supabase) await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <Page>
      <Screen>
        <Group>
          {items.map((item, index) => (
            <Row
              key={item.href}
              title={item.label}
              subtitle={item.hint}
              leading={<Ionicons name={item.icon} size={22} color={colors.purple} />}
              onPress={() => router.push(item.href)}
              last={index === items.length - 1}
            />
          ))}
        </Group>
        <Group>
          <Row title="বের হন" danger onPress={leave} last />
        </Group>
      </Screen>
    </Page>
  );
}
