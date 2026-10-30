import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { EntryActions, WhoWhen, useCanChange } from "../entry-tools";
import { dateLabel, monthName } from "../lib/dates";
import { parseAmount, taka } from "../lib/format";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Button, Chip, Empty, FAB, Field, Group, Page, Screen, Sheet, usePullReload } from "../ui";

const QUICK = ["বাসা ভাড়া", "বিদ্যুৎ বিল", "গ্যাস", "ওয়াইফাই", "বুয়া", "পানি", "হার্পিক/সাবান"];

export function BillsScreen() {
  const { state, me, today, month, ledger, monthReady, memberById, addBill, updateAmount, removeEntry, say } = useMess();
  const canChange = useCanChange();
  const { refreshing, onRefresh } = usePullReload();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    say("খরচ যোগ হয়েছে।");
  }

  return (
    <Page>
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <MonthPicker />
        <Text style={{ color: colors.muted, marginTop: 10, lineHeight: 20 }}>
          এই টাকা বাজারের মিল রেটে মেশে না। মাসের সব সদস্যে সমান ভাগ হয়।
        </Text>
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1, backgroundColor: colors.dark, borderRadius: 16, padding: 14 }}>
                <Text style={{ color: "rgba(255,255,255,0.7)" }}>{monthName(month)}</Text>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 }}>{taka(ledger.totalBills)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.paper, borderRadius: 16, padding: 14, elevation: 1 }}>
                <Text style={{ color: colors.muted }}>জনপ্রতি ({ledger.rows.length})</Text>
                <Text style={{ color: colors.purple, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{taka(ledger.share)}</Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <Group title="খরচের তালিকা">
                {rows.length ? (
                  rows.map((bill, index) => (
                    <View key={bill.id} style={{ padding: 16, borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700", fontSize: 16 }}>{bill.title}</Text>
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                            {bill.memberId === me.id ? "আমি" : memberById(bill.memberId)?.short ?? "সদস্য"} · {dateLabel(bill.date)}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: "800" }}>{taka(bill.amount)}</Text>
                      </View>
                      {canChange(bill) && (
                        <EntryActions amount={bill.amount} onSave={(value) => updateAmount("bill", bill.id, value)} onDelete={() => removeEntry("bill", bill.id)} />
                      )}
                    </View>
                  ))
                ) : (
                  <Empty text="এই মাসে এখনো কোনো খরচ যোগ হয়নি। নিচের + চাপুন।" />
                )}
              </Group>
            </View>
          </>
        )}
      </Screen>
      <FAB onPress={() => setOpen(true)} />
      <Sheet visible={open} title="ঘরের খরচ যোগ" onClose={() => setOpen(false)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
          {QUICK.map((item) => (
            <Chip key={item} label={item} active={title === item} onPress={() => setTitle(item)} />
          ))}
        </ScrollView>
        <View style={{ gap: 10 }}>
          <Field value={title} onChangeText={setTitle} placeholder="কিসের খরচ" maxLength={120} autoCapitalize="sentences" />
          <Field value={amount} onChangeText={setAmount} placeholder="টাকা" keyboardType="decimal-pad" />
        </View>
        <WhoWhen memberId={memberId} date={date} onMember={setMemberId} onDate={setDate} />
        <View style={{ marginTop: 16 }}>
          <Button label="খরচ যোগ করুন" kind="dark" onPress={save} busy={busy} />
        </View>
      </Sheet>
    </Page>
  );
}
