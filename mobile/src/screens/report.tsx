import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { confirm } from "../confirm";
import { EntryActions, useCanChange } from "../entry-tools";
import { addMonths, dateLabel, editDeadline, monthLabel, monthOf, monthOpen } from "../lib/dates";
import { mealText, taka } from "../lib/format";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Screen, usePullReload } from "../ui";

export function ReportScreen() {
  const { state, members, months, today, isManager, monthReady, ensureMonth, ledgerFor, memberById, approve, updateAmount, removeEntry } = useMess();
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

  const badge = !finished
    ? { text: "চলতি মাস · এখন পর্যন্ত", bg: colors.warn, fg: colors.warnInk }
    : approved
      ? { text: "ম্যানেজার অ্যাপ্রুভ করেছেন", bg: colors.goodBg, fg: colors.good }
      : { text: "ম্যানেজার এখনো অ্যাপ্রুভ করেননি", bg: colors.soft, fg: colors.purple };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {finished ? (open ? `${dateLabel(editDeadline(target))} রাত পর্যন্ত সংশোধন করা যাবে` : "সংশোধনের সময় শেষ") : "মাস শেষে ১ তারিখে চূড়ান্ত হবে"}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "700" }}>{monthLabel(target)} রিপোর্ট</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <View style={{ borderRadius: 999, backgroundColor: badge.bg, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: badge.fg, fontWeight: "700", fontSize: 13 }}>{badge.text}</Text>
        </View>
        <MonthPicker value={target} onChange={setTarget} />
      </View>

      {!monthReady(target) ? (
        <MonthLoading />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Tile label="মোট বাজার" value={taka(ledger.totalBazaar)} tint={colors.mintCard} />
            <Tile label="মোট মিল" value={mealText(ledger.totalMeals)} tint={colors.lilac} />
            <Tile label="প্রতি মিল" value={ledger.rate == null ? "—" : taka(ledger.rate)} tint={colors.sand} />
            <Tile label="ঘরের বিল" value={taka(ledger.totalBills)} tint={colors.lime} />
          </View>
          {ledger.totalBazaar > 0 && ledger.totalMeals === 0 && (
            <Text style={{ backgroundColor: colors.warn, borderRadius: 22, padding: 14, marginTop: 12, lineHeight: 20 }}>
              বাজার আছে কিন্তু কোনো মিল নেই, তাই মিল রেট বের করা যাচ্ছে না। আগে মিলগুলো ঠিক করুন।
            </Text>
          )}
          <View style={{ marginTop: 12, borderRadius: 24, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
            {ledger.rows.map((row) => (
              <Pressable key={row.member.id} onPress={() => router.push(`/members/${row.member.id}`)} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
                <Text style={{ fontWeight: "700" }}>{row.member.name}</Text>
                <Text style={{ fontSize: 14, marginTop: 2 }}>{mealText(row.meals)} মিল</Text>
                <Text style={{ fontSize: 14 }}>খাবার {taka(row.food)}</Text>
                <Text style={{ fontSize: 14 }}>দিয়েছে {taka(row.paid)}</Text>
                <Text style={{ fontSize: 14 }}>ভাগ {taka(row.share)}</Text>
                <Text style={{ fontWeight: "700", marginTop: 4, color: row.net > 0 ? colors.good : row.net < 0 ? colors.bad : colors.muted }}>
                  {row.net === 0 ? "সমান" : `${row.net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(row.net))}`}
                </Text>
              </Pressable>
            ))}
          </View>
          {finished && manager && (
            <Text style={{ marginTop: 12, borderRadius: 22, padding: 14, lineHeight: 22, backgroundColor: approved ? colors.goodBg : colors.wash }}>
              যার দিতে হবে, সে ম্যানেজার {manager.name}-এর কাছে জমা দেবে। যার পাওনা, সে ম্যানেজারের কাছ থেকে নেবে।
              {open ? ` ${dateLabel(editDeadline(target))} রাত পর্যন্ত ভুল সারানো যাবে। সারালে অ্যাপ্রুভ আবার খুলবে।` : ""}
            </Text>
          )}
          {isManager && finished && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Pressable
                onPress={onApprove}
                disabled={approved || busy}
                style={{ height: 48, borderRadius: 16, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, opacity: approved ? 0.4 : 1, alignSelf: "flex-start" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>{approved ? "অ্যাপ্রুভ করা হয়েছে" : busy ? "অপেক্ষা…" : "রিপোর্ট অ্যাপ্রুভ"}</Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 12 }}>অ্যাপ্রুভের তারিখ বাঁধা নেই। সংখ্যা বদল {dateLabel(editDeadline(target))} পর্যন্ত।</Text>
            </View>
          )}
          <View style={[panel, { marginTop: 12 }]}>
            <Text style={{ fontWeight: "700" }}>বাজারের অঙ্ক</Text>
            {bazaar.map((row) => (
              <View key={row.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1}>{row.note.split("\n")[0] || "বাজার"}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: "700" }}>{taka(row.amount)}</Text>
                </View>
                {canChange(row) && <EntryActions amount={row.amount} onSave={(value) => updateAmount("bazaar", row.id, value)} onDelete={() => removeEntry("bazaar", row.id)} />}
              </View>
            ))}
            {!bazaar.length && <Text style={{ color: colors.muted, marginTop: 8 }}>কোনো বাজার নেই।</Text>}
          </View>
          <View style={panel}>
            <Text style={{ fontWeight: "700" }}>ঘরের বিল</Text>
            {bills.map((row) => (
              <View key={row.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1}>{row.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: "700" }}>{taka(row.amount)}</Text>
                </View>
                {canChange(row) && <EntryActions amount={row.amount} onSave={(value) => updateAmount("bill", row.id, value)} onDelete={() => removeEntry("bill", row.id)} />}
              </View>
            ))}
            {!bills.length && <Text style={{ color: colors.muted, marginTop: 8 }}>কোনো বিল নেই।</Text>}
          </View>
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={{ width: "47%", borderRadius: 22, padding: 16, backgroundColor: tint }}>
      <Text style={{ fontSize: 12, color: colors.inkSoft }}>{label}</Text>
      <Text style={{ marginTop: 8, fontSize: 20, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const panel = { borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 12 };
