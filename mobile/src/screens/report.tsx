import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { confirm } from "../confirm";
import { EntryActions, useCanChange } from "../entry-tools";
import { addMonths, dateLabel, editDeadline, monthLabel, monthOf, monthOpen } from "../lib/dates";
import { mealText, taka } from "../lib/format";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Avatar, Button, Empty, Group, Row, Screen, usePullReload } from "../ui";

export function ReportScreen() {
  const { state, members, months, today, isManager, monthReady, ensureMonth, ledgerFor, approve, updateAmount, removeEntry } = useMess();
  const canChange = useCanChange();
  const { refreshing, onRefresh } = usePullReload();
  const current = monthOf(today);
  const previous = addMonths(current, -1);
  const [target, setTarget] = useState(months.includes(previous) ? previous : current);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureMonth(target);
  }, [ensureMonth, target]);

  const ledger = ledgerFor(target);
  const finished = target < current;
  const approved = state.approvals.includes(target);
  const open = monthOpen(target, today);
  const manager = members.find((member) => member.role === "manager" && !member.leftOn);
  const bazaar = state.bazaar.filter((row) => row.date.startsWith(target));
  const bills = state.bills.filter((row) => row.date.startsWith(target));

  async function onApprove() {
    if (!(await confirm(`${monthLabel(target)} রিপোর্ট অ্যাপ্রুভ করবেন? পরে কোনো অঙ্ক বদলালে অ্যাপ্রুভ আবার খুলে যাবে।`))) return;
    setBusy(true);
    await approve(target);
    setBusy(false);
  }

  let badge = "চলতি মাস · এখন পর্যন্ত";
  if (finished) badge = approved ? "ম্যানেজার অ্যাপ্রুভ করেছেন" : "ম্যানেজার এখনো অ্যাপ্রুভ করেননি";

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>
        {finished ? (open ? `${dateLabel(editDeadline(target))} রাত পর্যন্ত সংশোধন করা যাবে` : "সংশোধনের সময় শেষ") : "মাস শেষে ১ তারিখে চূড়ান্ত হবে"}
      </Text>
      <MonthPicker value={target} onChange={setTarget} />
      <View style={{ alignSelf: "flex-start", backgroundColor: approved ? "#E5F8EC" : colors.paper, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 }}>
        <Text style={{ color: approved ? colors.good : colors.purple, fontWeight: "700", fontSize: 12 }}>{badge}</Text>
      </View>
      {!monthReady(target) ? (
        <MonthLoading />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Tile label="মোট বাজার" value={taka(ledger.totalBazaar)} />
            <Tile label="মোট মিল" value={mealText(ledger.totalMeals)} />
            <Tile label="প্রতি মিল" value={ledger.rate == null ? "—" : taka(ledger.rate)} />
            <Tile label="ঘরের বিল" value={taka(ledger.totalBills)} />
          </View>
          {ledger.totalBazaar > 0 && ledger.totalMeals === 0 && (
            <Text style={{ backgroundColor: colors.warn, padding: 12, borderRadius: 14, marginTop: 10 }}>
              বাজার আছে কিন্তু কোনো মিল নেই, তাই মিল রেট বের করা যাচ্ছে না।
            </Text>
          )}
          <View style={{ marginTop: 16 }}>
            <Group title="সদস্যদের হিসাব">
              {ledger.rows.map((row, index) => (
                <Row
                  key={row.member.id}
                  title={row.member.name}
                  subtitle={`${mealText(row.meals)} মিল · খাবার ${taka(row.food)} · দিয়েছে ${taka(row.paid)}`}
                  leading={<Avatar name={row.member.name} src={row.member.avatarUrl} size={40} />}
                  trailing={
                    <Text style={{ fontWeight: "800", color: row.net > 0 ? colors.good : row.net < 0 ? colors.bad : colors.muted }}>
                      {row.net === 0 ? "সমান" : `${row.net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(row.net))}`}
                    </Text>
                  }
                  onPress={() => router.push(`/members/${row.member.id}`)}
                  last={index === ledger.rows.length - 1}
                />
              ))}
            </Group>
          </View>
          {finished && manager && (
            <Text style={{ backgroundColor: colors.paper, padding: 14, borderRadius: 14, lineHeight: 22, elevation: 1 }}>
              যার দিতে হবে, সে ম্যানেজার {manager.name}-এর কাছে জমা দেবে। যার পাওনা, সে ম্যানেজারের কাছ থেকে নেবে।
            </Text>
          )}
          {isManager && finished && (
            <View style={{ marginTop: 12 }}>
              <Button label={approved ? "অ্যাপ্রুভ করা হয়েছে" : "রিপোর্ট অ্যাপ্রুভ"} disabled={approved} busy={busy} onPress={onApprove} />
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <Group title="বাজারের অঙ্ক">
              {bazaar.length ? (
                bazaar.map((row, index) => (
                  <View key={row.id} style={{ padding: 16, borderBottomWidth: index === bazaar.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ flex: 1 }} numberOfLines={2}>{row.note.split("\n")[0] || "বাজার"}</Text>
                      <Text style={{ fontWeight: "800" }}>{taka(row.amount)}</Text>
                    </View>
                    {canChange(row) && <EntryActions amount={row.amount} onSave={(value) => updateAmount("bazaar", row.id, value)} onDelete={() => removeEntry("bazaar", row.id)} />}
                  </View>
                ))
              ) : (
                <Empty text="কোনো বাজার নেই।" />
              )}
            </Group>
          </View>
          <Group title="ঘরের বিল">
            {bills.length ? (
              bills.map((row, index) => (
                <View key={row.id} style={{ padding: 16, borderBottomWidth: index === bills.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text>{row.title}</Text>
                    <Text style={{ fontWeight: "800" }}>{taka(row.amount)}</Text>
                  </View>
                  {canChange(row) && <EntryActions amount={row.amount} onSave={(value) => updateAmount("bill", row.id, value)} onDelete={() => removeEntry("bill", row.id)} />}
                </View>
              ))
            ) : (
              <Empty text="কোনো বিল নেই।" />
            )}
          </Group>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "47%", backgroundColor: colors.paper, borderRadius: 16, padding: 14, elevation: 1 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "800", marginTop: 6 }}>{value}</Text>
    </View>
  );
}
