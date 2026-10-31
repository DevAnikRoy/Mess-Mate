import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { EntryActions, WhoWhen, useCanChange } from "../entry-tools";
import { dateLabel, monthName } from "../lib/dates";
import { parseAmount, taka } from "../lib/format";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Screen, Title, usePullReload } from "../ui";

const QUICK = ["বাসা ভাড়া", "বিদ্যুৎ বিল", "গ্যাস", "ওয়াইফাই", "বুয়া", "পানি", "হার্পিক/সাবান"];

export function BillsScreen() {
  const { state, me, today, month, ledger, monthReady, memberById, addBill, updateAmount, removeEntry, say } = useMess();
  const canChange = useCanChange();
  const { refreshing, onRefresh } = usePullReload();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState(me.id);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const rows = state.bills.filter((bill) => bill.date.startsWith(month));

  async function save() {
    const value = parseAmount(amount);
    if (!title.trim()) return say("কিসের খরচ সেটা লিখুন।");
    if (value == null) return say("সঠিক টাকার অঙ্ক দিন।");
    setBusy(true);
    const ok = await addBill({ memberId, date, title: title.trim().slice(0, 120), amount: value });
    setBusy(false);
    if (!ok) return;
    setTitle("");
    setAmount("");
    setMemberId(me.id);
    setDate(today);
    say("খরচ যোগ হয়েছে।");
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Title kicker="ভাড়া, কারেন্ট, ওয়াইফাই, হার্পিক">ঘরের খরচ</Title>
      <Text style={{ color: colors.inkSoft, lineHeight: 22, marginBottom: 12 }}>
        এই টাকা বাজারের মিল রেটে মেশে না। মাসের সব সদস্যে সমান ভাগ হয়। যে দিয়েছে, তার দেওয়া টাকা থেকে বাদ যায়।
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {QUICK.map((item) => (
          <Pressable key={item} onPress={() => setTitle(item)} style={{ backgroundColor: colors.field, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12 }}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="কিসের খরচ" placeholderTextColor={colors.muted} style={field} />
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="টাকা" placeholderTextColor={colors.muted} style={field} />
      <WhoWhen memberId={memberId} date={date} onMember={setMemberId} onDate={setDate} />
      <Pressable onPress={save} disabled={busy} style={{ marginTop: 12, height: 48, borderRadius: 16, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>{busy ? "সেভ হচ্ছে…" : "খরচ যোগ করুন"}</Text>
      </Pressable>

      <View style={{ marginTop: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontWeight: "700" }}>{monthName(month)}</Text>
          <MonthPicker />
        </View>
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.dark, borderRadius: 16, padding: 12 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>মোট খরচ</Text>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{taka(ledger.totalBills)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.soft, borderRadius: 16, padding: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                  জনপ্রতি ({ledger.rows.length} জন)
                </Text>
                <Text style={{ color: colors.purple, fontSize: 18, fontWeight: "700" }}>{taka(ledger.share)}</Text>
              </View>
            </View>
            <View style={{ marginTop: 12, gap: 8 }}>
              {rows.map((bill) => (
                <View key={bill.id} style={{ backgroundColor: "#FAF8FF", borderRadius: 16, padding: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700" }} numberOfLines={1}>
                        {bill.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        {bill.memberId === me.id ? "আমি" : memberById(bill.memberId)?.short ?? "সদস্য"} দিয়েছেন · {dateLabel(bill.date)}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "700" }}>{taka(bill.amount)}</Text>
                  </View>
                  {canChange(bill) && (
                    <EntryActions amount={bill.amount} onSave={(value) => updateAmount("bill", bill.id, value)} onDelete={() => removeEntry("bill", bill.id)} />
                  )}
                </View>
              ))}
              {!rows.length && <Text style={{ textAlign: "center", color: colors.muted, paddingVertical: 24 }}>এই মাসে এখনো কোনো খরচ যোগ হয়নি।</Text>}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const field = {
  height: 48,
  borderRadius: 16,
  backgroundColor: "#F7F5FC",
  paddingHorizontal: 16,
  marginTop: 8,
  color: colors.ink,
  fontSize: 16,
};
