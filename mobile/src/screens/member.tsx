import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Spark } from "../charts";
import { dateLabel, monthName, monthOf } from "../lib/dates";
import { mealText, taka } from "../lib/format";
import { SLOTS, markWeight, readMark } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Avatar, Screen } from "../ui";

export function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, month, today, ledger, monthReady, memberById } = useMess();
  const member = memberById(id ?? "");

  if (!member) {
    return (
      <Screen>
        <View style={{ borderRadius: 28, backgroundColor: colors.wash, padding: 24, alignItems: "center" }}>
          <Text style={{ fontWeight: "700" }}>এই সদস্যকে আপনার মেসে পাওয়া যায়নি</Text>
          <Text onPress={() => router.push("/mess")} style={{ marginTop: 12, color: colors.purple, fontWeight: "700" }}>
            সদস্যদের তালিকা
          </Text>
        </View>
      </Screen>
    );
  }

  const row = ledger.rows.find((item) => item.member.id === member.id);
  const upto = month === monthOf(today) ? Number(today.slice(8, 10)) : ledger.days;
  const series = ledger.daily.slice(0, upto).map((day) => (day.closed ? 0 : markWeight(readMark(state, member.id, day.date))));
  const shops = state.bazaar.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const paidBills = state.bills.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const guests = state.guests.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const net = row?.net ?? 0;

  return (
    <Screen>
      <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
        <MonthPicker />
      </View>
      <View style={{ borderRadius: 28, padding: 20, backgroundColor: member.tint }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar name={member.name} src={member.avatarUrl} size={56} />
          <View style={{ flex: 1 }}>
            <Text>
              {member.leftOn ? "মেস ছেড়েছেন" : member.role === "manager" ? "ম্যানেজার" : "সদস্য"}
              {member.id === me.id ? " · আপনি" : ""}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "700" }} numberOfLines={2}>
              {member.name}
            </Text>
          </View>
        </View>
        <Text style={{ marginTop: 16 }}>{monthName(month)} মাসের ব্যালেন্স</Text>
        <Text style={{ fontSize: 32, fontWeight: "700" }}>{net === 0 ? taka(0) : `${net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(net))}`}</Text>
        {series.length > 1 && (
          <View style={{ marginTop: 12 }}>
            <Spark values={series} color={member.ink} />
          </View>
        )}
      </View>
      {!monthReady(month) ? (
        <View style={{ marginTop: 12 }}>
          <MonthLoading />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            <Cell label="মিল" value={mealText(row?.meals ?? 0)} />
            <Cell label="খাবার" value={taka(row?.food ?? 0)} />
            <Cell label="বাজার" value={taka(row?.bazaar ?? 0)} />
            <Cell label="বিল দিয়েছে" value={taka(row?.billsPaid ?? 0)} />
          </View>
          {row && (
            <Text style={{ marginTop: 12, color: colors.inkSoft }}>
              খাবার {taka(row.food)} + বিলের ভাগ {taka(row.share)}। দিয়েছে {taka(row.paid)}।
            </Text>
          )}
          {guests.length > 0 && (
            <Text style={{ marginTop: 8 }}>
              অতিথি: {guests.map((guest) => `${dateLabel(guest.date)} ${SLOTS.find((slot) => slot.key === guest.slot)?.label} ${guest.count} জন`).join(", ")}। এই মিল তার নামেই আছে।
            </Text>
          )}
          <View style={{ marginTop: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
            <Text style={{ fontWeight: "700" }}>বাজারের লেখা</Text>
            {shops.map((shop) => (
              <View key={shop.id} style={{ marginTop: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.muted }}>{dateLabel(shop.date)}</Text>
                  <Text style={{ fontWeight: "700" }}>{taka(shop.amount)}</Text>
                </View>
                <Text style={{ lineHeight: 20 }}>{shop.note}</Text>
              </View>
            ))}
            {!shops.length && <Text style={{ color: colors.muted, marginTop: 8 }}>এই মাসে কোনো বাজার নেই।</Text>}
          </View>
          {paidBills.length > 0 && (
            <View style={{ marginTop: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
              <Text style={{ fontWeight: "700" }}>যে বিল দিয়েছেন</Text>
              {paidBills.map((bill) => (
                <View key={bill.id} style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
                  <Text>{bill.title}</Text>
                  <Text style={{ fontWeight: "700" }}>{taka(bill.amount)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "47%", borderRadius: 16, backgroundColor: "#F7F5FC", padding: 12 }}>
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
