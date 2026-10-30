import { Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { dateLabel, monthName } from "../lib/dates";
import { mealText, taka } from "../lib/format";
import { SLOTS } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Avatar, Button, Empty, Group, Row, Screen } from "../ui";

export function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, month, ledger, monthReady, memberById } = useMess();
  const member = memberById(id ?? "");

  if (!member) {
    return (
      <Screen>
        <Group>
          <Row title="এই সদস্যকে আপনার মেসে পাওয়া যায়নি" last />
        </Group>
        <Button label="সদস্যদের তালিকা" onPress={() => router.push("/mess")} />
      </Screen>
    );
  }

  const row = ledger.rows.find((item) => item.member.id === member.id);
  const shops = state.bazaar.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const paidBills = state.bills.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const guests = state.guests.filter((item) => item.memberId === member.id && item.date.startsWith(month));
  const net = row?.net ?? 0;

  return (
    <Screen>
      <MonthPicker />
      <View style={{ backgroundColor: colors.paper, borderRadius: 16, padding: 16, marginTop: 12, elevation: 1, flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Avatar name={member.name} src={member.avatarUrl} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted }}>
            {member.leftOn ? "মেস ছেড়েছেন" : member.role === "manager" ? "ম্যানেজার" : "সদস্য"}
            {member.id === me.id ? " · আপনি" : ""}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>{member.name}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: colors.paper, borderRadius: 16, padding: 16, marginTop: 12, elevation: 1 }}>
        <Text style={{ color: colors.muted }}>{monthName(month)} মাসের ব্যালেন্স</Text>
        <Text style={{ fontSize: 28, fontWeight: "800", color: net > 0 ? colors.good : net < 0 ? colors.bad : colors.ink, marginTop: 4 }}>
          {net === 0 ? taka(0) : `${net > 0 ? "পাবে " : "দিবে "}${taka(Math.abs(net))}`}
        </Text>
      </View>
      {!monthReady(month) ? (
        <MonthLoading />
      ) : (
        <>
          <View style={{ marginTop: 16 }}>
            <Group title="হিসাব">
              <Row title="মিল" trailing={<Text style={{ fontWeight: "800" }}>{mealText(row?.meals ?? 0)}</Text>} />
              <Row title="খাবার" trailing={<Text style={{ fontWeight: "800" }}>{taka(row?.food ?? 0)}</Text>} />
              <Row title="বাজার" trailing={<Text style={{ fontWeight: "800" }}>{taka(row?.bazaar ?? 0)}</Text>} />
              <Row title="বিল দিয়েছে" trailing={<Text style={{ fontWeight: "800" }}>{taka(row?.billsPaid ?? 0)}</Text>} last />
            </Group>
          </View>
          {guests.length > 0 && (
            <Group title="অতিথি">
              {guests.map((guest, index) => (
                <Row
                  key={guest.id}
                  title={`${guest.count} জন · ${SLOTS.find((slot) => slot.key === guest.slot)?.label}`}
                  subtitle={dateLabel(guest.date)}
                  last={index === guests.length - 1}
                />
              ))}
            </Group>
          )}
          <Group title="বাজারের লেখা">
            {shops.length ? (
              shops.map((shop, index) => (
                <Row key={shop.id} title={shop.note.split("\n")[0] || "বাজার"} subtitle={dateLabel(shop.date)} trailing={<Text style={{ fontWeight: "800" }}>{taka(shop.amount)}</Text>} last={index === shops.length - 1} />
              ))
            ) : (
              <Empty text="এই মাসে কোনো বাজার নেই।" />
            )}
          </Group>
          {paidBills.length > 0 && (
            <Group title="যে বিল দিয়েছেন">
              {paidBills.map((bill, index) => (
                <Row key={bill.id} title={bill.title} trailing={<Text style={{ fontWeight: "800" }}>{taka(bill.amount)}</Text>} last={index === paidBills.length - 1} />
              ))}
            </Group>
          )}
        </>
      )}
    </Screen>
  );
}
