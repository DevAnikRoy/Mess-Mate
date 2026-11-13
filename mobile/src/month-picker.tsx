import { Pressable, ScrollView, Text, View } from "react-native";
import { bnDigits, monthName, monthOf } from "./lib/dates";
import { useMess } from "./lib/store";
import { colors } from "./theme";

export function MonthPicker({ value, onChange }: { value?: string; onChange?: (month: string) => void }) {
  const { months, month, setMonth, today } = useMess();
  const current = value ?? month;
  const pick = onChange ?? setMonth;
  const year = monthOf(today).slice(0, 4);
  if (months.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxWidth: "100%" }} contentContainerStyle={{ backgroundColor: colors.field, borderRadius: 999, padding: 4 }}>
      {[...months].reverse().map((item) => {
        const on = current === item;
        return (
          <Pressable key={item} onPress={() => pick(item)} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? colors.paper : "transparent" }}>
            <Text style={{ color: on ? colors.ink : colors.muted, fontWeight: on ? "700" : "400", fontSize: 14 }}>
              {monthName(item)}
              {item.slice(0, 4) !== year ? ` ${bnDigits(item.slice(2, 4))}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function MonthLoading() {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 112, borderRadius: 24, backgroundColor: colors.wash }} />
      <View style={{ height: 220, borderRadius: 24, backgroundColor: colors.wash }} />
    </View>
  );
}
