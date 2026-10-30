import { Pressable, ScrollView, Text, View } from "react-native";
import { bnDigits, monthName, monthOf } from "./lib/dates";
import { useMess } from "./lib/store";
import { colors } from "./theme";
import { ripple } from "./ui";

export function MonthPicker({ value, onChange }: { value?: string; onChange?: (month: string) => void }) {
  const { months, month, setMonth, today } = useMess();
  const current = value ?? month;
  const pick = onChange ?? setMonth;
  const year = monthOf(today).slice(0, 4);
  if (months.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {[...months].reverse().map((item) => {
        const on = current === item;
        return (
          <Pressable
            key={item}
            onPress={() => pick(item)}
            android_ripple={ripple}
            style={{
              backgroundColor: on ? colors.purple : colors.paper,
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              elevation: on ? 0 : 1,
            }}
          >
            <Text style={{ color: on ? "#fff" : colors.ink, fontWeight: "700", fontSize: 13 }}>
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
  return <View style={{ height: 88, borderRadius: 16, backgroundColor: colors.paper, marginTop: 12 }} />;
}
