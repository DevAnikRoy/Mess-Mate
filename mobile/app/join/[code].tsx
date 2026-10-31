import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { JoinBox } from "../../src/screens/onboarding";
import { colors } from "../../src/theme";
import { Screen } from "../../src/ui";

export default function JoinPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Screen canvas={colors.bg}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 16 }}>মেসে যোগ দিন</Text>
      <JoinBox initialCode={code ?? ""} />
    </Screen>
  );
}
