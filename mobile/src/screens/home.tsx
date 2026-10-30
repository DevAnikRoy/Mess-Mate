import { useLayoutEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { addMonths, monthLabel, monthName, monthOf } from "../lib/dates";
import { mealText, taka } from "../lib/format";
import { mealKey } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Avatar, Empty, Group, Money, Row, Screen, usePullReload, ripple } from "../ui";

export function HomeScreen() {
  const { ledger, month, state, mess, me, isManager, today, months, activeMembers, monthReady } = useMess();
  const navigation = useNavigation();
  const { refreshing, onRefresh } = usePullReload();
  const current = monthOf(today);
  const mine = ledger.rows.find((row) => row.member.id === me.id);
  const previous = addMonths(current, -1);
  const markedToday = Boolean(state.meals[mealKey(me.id, today)]) || state.kitchenClosed.includes(today);
  const net = mine?.net ?? 0;
  const tone = net > 0 ? "good" : net < 0 ? "bad" : "purple";

  useLayoutEffect(() => {
    navigation.setOptions({ title: mess.name });
  }, [navigation, mess.name]);

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <MonthPicker />
      {!monthReady(month) ? (
        <MonthLoading />
      ) : (
        <>
          <View style={{ backgroundColor: colors.paper, borderRadius: 20, padding: 20, marginTop: 12, elevation: 2 }}>
            <Text style={{ color: colors.muted }}>{monthLabel(month)} · আমার হিসাব</Text>
            <Money
              amount={net === 0 ? taka(0) : `${net > 0 ? "পাবে " : "দিবে "}${taka(Math.abs(net))}`}
              tone={tone}
            />
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              বাজার {taka(mine?.bazaar ?? 0)} · বিল {taka(ledger.totalBills ? ledger.share : 0)} · {mealText(mine?.meals ?? 0)} মিল
            </Text>
          </View>

          {month === current && !markedToday && (
            <Pressable
              onPress={() => router.push("/meals")}
              android_ripple={ripple}
              style={{ backgroundColor: colors.purple, borderRadius: 16, padding: 16, marginTop: 12 }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>আজকের মিল দিন</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>রাত ১২টার পর আজকের ঘর বন্ধ।</Text>
            </Pressable>
          )}
          {months.includes(previous) && month === current && (
            <Pressable
              onPress={() => router.push("/report")}
              android_ripple={ripple}
              style={{ backgroundColor: colors.paper, borderRadius: 16, padding: 16, marginTop: 12, elevation: 1 }}
            >
              <Text style={{ fontWeight: "700" }}>{monthName(previous)} মাসের রিপোর্ট</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {state.approvals.includes(previous) ? "ম্যানেজার অ্যাপ্রুভ করেছেন।" : "এখনো অ্যাপ্রুভ হয়নি।"}
              </Text>
            </Pressable>
          )}
          {isManager && activeMembers.length < 2 && (
            <Pressable
              onPress={() => router.push("/mess")}
              android_ripple={ripple}
              style={{ backgroundColor: colors.mint, borderRadius: 16, padding: 16, marginTop: 12 }}
            >
              <Text style={{ fontWeight: "700" }}>সদস্যদের যুক্ত করুন</Text>
              <Text style={{ color: colors.mintInk, marginTop: 4 }}>ইনভাইট কোড পাঠালেই তারা যোগ দিতে পারবে।</Text>
            </Pressable>
          )}

          <View style={{ marginTop: 18 }}>
            <Group title="কে কত দিবে বা পাবে">
              {ledger.rows.length ? (
                ledger.rows.map((row, index) => (
                  <Row
                    key={row.member.id}
                    title={row.member.id === me.id ? "আমি" : row.member.name}
                    subtitle={`${mealText(row.meals)} মিল · বাজার ${taka(row.bazaar)}`}
                    leading={<Avatar name={row.member.name} src={row.member.avatarUrl} size={40} />}
                    trailing={
                      <Text
                        style={{
                          fontWeight: "800",
                          color: row.net > 0 ? colors.good : row.net < 0 ? colors.bad : colors.muted,
                        }}
                      >
                        {row.net === 0 ? "সমান" : `${row.net > 0 ? "+" : "−"}${taka(Math.abs(row.net))}`}
                      </Text>
                    }
                    onPress={() => router.push(`/members/${row.member.id}`)}
                    last={index === ledger.rows.length - 1}
                  />
                ))
              ) : (
                <Empty text={`${monthName(month)} মাসের হিসাব এখনো ফাঁকা। মিল আর বাজার লিখলেই এখানে দেখা যাবে।`} />
              )}
            </Group>
          </View>

          <Group title="এই মাস">
            <Row title="প্রতি মিল" trailing={<Text style={stylesValue}>{ledger.rate == null ? "—" : taka(ledger.rate)}</Text>} />
            <Row title="মোট মিল" trailing={<Text style={stylesValue}>{mealText(ledger.totalMeals)}</Text>} />
            <Row title="মোট বাজার" trailing={<Text style={stylesValue}>{taka(ledger.totalBazaar)}</Text>} />
            <Row title="ঘরের বিল" trailing={<Text style={stylesValue}>{taka(ledger.totalBills)}</Text>} last />
          </Group>
        </>
      )}
    </Screen>
  );
}

const stylesValue = { fontWeight: "800" as const, color: colors.ink, fontSize: 16 };
