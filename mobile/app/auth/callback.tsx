import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { sessionFromUrl } from "../../src/lib/auth";
import { colors } from "../../src/theme";

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const run = async () => {
      try {
        if (params.code) {
          await sessionFromUrl(`messmate://auth/callback?code=${params.code}`);
        } else {
          const url = await Linking.getInitialURL();
          if (url) await sessionFromUrl(url);
        }
      } catch {
        /* Gate sends the user back to login if there is still no session. */
      }
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
