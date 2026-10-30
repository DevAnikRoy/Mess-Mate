import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMaybeMess } from "./lib/store";

export function Toast() {
  const store = useMaybeMess();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!store?.notice) return;
    const timer = setTimeout(store.clearNotice, 4500);
    return () => clearTimeout(timer);
  }, [store?.notice, store?.clearNotice]);
  if (!store?.notice) return null;
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(insets.bottom, 12) + 64,
        backgroundColor: "#17171C",
        borderRadius: 14,
        padding: 14,
        elevation: 8,
      }}
    >
      <Text style={{ color: "#fff" }}>{store.notice}</Text>
    </View>
  );
}
