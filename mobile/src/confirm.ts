import { Alert, Share } from "react-native";

export function confirm(message: string, ok = "হ্যাঁ") {
  return new Promise<boolean>((resolve) => {
    Alert.alert("মেসমেট", message, [
      { text: "না", style: "cancel", onPress: () => resolve(false) },
      { text: ok, onPress: () => resolve(true) },
    ]);
  });
}

export async function shareText(message: string) {
  await Share.share({ message });
}
