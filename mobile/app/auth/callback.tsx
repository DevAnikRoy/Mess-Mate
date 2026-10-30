import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { createClient } from "../../src/lib/supabase";
import { colors } from "../../src/theme";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      if (supabase && params.code) await supabase.auth.exchangeCodeForSession(params.code);
      router.replace("/");
    };
    void run();
  }, [params.code, router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.purple} />
    </View>
  );
}
