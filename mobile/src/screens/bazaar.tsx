import { useState } from "react";
import { Text, View } from "react-native";
import { EntryActions, WhoWhen, useCanChange } from "../entry-tools";
import { dateLabel, monthName } from "../lib/dates";
import { parseAmount, taka } from "../lib/format";
import { monthMembers, suggestTotal } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Button, Empty, FAB, Field, Group, Page, Row, Screen, Sheet, usePullReload } from "../ui";

export function BazaarScreen() {
  const { state, me, today, month, members, monthReady, memberById, addBazaar, updateAmount, removeEntry, say } = useMess();
  const canChange = useCanChange();
  const { refreshing, onRefresh } = usePullReload();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [guess, setGuess] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState(me.id);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const rows = state.bazaar.filter((row) => row.date.startsWith(month));
  const people = monthMembers(state, members, month);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  function preview() {
    const found = suggestTotal(note);
    setGuess(found);
    if (found != null) setAmount(String(found));
    else say("লেখায় কোনো অঙ্ক পাওয়া যায়নি। নিচে নিজে মোট লিখুন।");
  }

  function resetForm() {
    setNote("");
    setAmount("");
    setGuess(null);
    setMemberId(me.id);
    setDate(today);
  }

  async function save() {
    const value = parseAmount(amount);
    if (value == null) return say("নিশ্চিত মোট টাকা লিখুন।");
    if (!note.trim()) return say("কী কী কিনেছেন সেটা লিখুন।");
    setBusy(true);
    const ok = await addBazaar({ memberId, date, note: note.trim().slice(0, 2000), amount: value });
    setBusy(false);
    if (!ok) return;
    resetForm();
    setOpen(false);
    say("বাজার সেভ হয়েছে।");
  }

  return (
    <Page>
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <MonthPicker />
        <View style={{ backgroundColor: colors.dark, borderRadius: 16, padding: 18, marginTop: 12 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)" }}>{monthName(month)} মাসের বাজার</Text>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4 }}>{taka(total)}</Text>
        </View>
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <View style={{ marginTop: 16 }}>
              <Group title="কে কত কিনেছে">
                {people.map((member, index) => {
                  const sum = rows.filter((row) => row.memberId === member.id).reduce((value, row) => value + row.amount, 0);
                  return (
                    <Row
                      key={member.id}
                      title={member.id === me.id ? "আমি" : member.name}
                      trailing={<Text style={{ fontWeight: "800" }}>{taka(sum)}</Text>}
                      last={index === people.length - 1}
                    />
                  );
                })}
              </Group>
            </View>
            <Group title="বাজারের খাতা">
              {rows.length ? (
                rows.map((row, index) => (
                  <View key={row.id} style={{ borderBottomWidth: index === rows.length - 1 ? 0 : 1, borderBottomColor: colors.line, padding: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700", fontSize: 16 }}>{row.note.split("\n")[0] || "বাজার"}</Text>
                        <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
                          {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                        </Text>
                        {row.note.includes("\n") ? <Text style={{ marginTop: 6, color: colors.ink }}>{row.note}</Text> : null}
                      </View>
                      <Text style={{ fontWeight: "800" }}>{taka(row.amount)}</Text>
                    </View>
                    {canChange(row) && (
                      <EntryActions amount={row.amount} onSave={(value) => updateAmount("bazaar", row.id, value)} onDelete={() => removeEntry("bazaar", row.id)} />
                    )}
                  </View>
                ))
              ) : (
                <Empty text="এই মাসে এখনো কোনো বাজার লেখা হয়নি। নিচের + চাপুন।" />
              )}
            </Group>
          </>
        )}
      </Screen>
      <FAB onPress={() => setOpen(true)} />
      <Sheet visible={open} title="নতুন বাজার" onClose={() => setOpen(false)}>
        <Field value={note} onChangeText={setNote} placeholder={"যেমন:\nচাল ৫ কেজি ৩৫০\nসবজি ১৮০"} multiline maxLength={2000} autoCapitalize="sentences" />
        <View style={{ marginTop: 10 }}>
          <Button label="অঙ্ক বের করো" kind="ghost" disabled={!note.trim()} onPress={preview} />
        </View>
        {guess != null && <Text style={{ color: colors.muted, marginTop: 8 }}>লেখা থেকে {taka(guess)} পাওয়া গেছে</Text>}
        <Text style={{ marginTop: 14, marginBottom: 8, fontWeight: "600" }}>নিশ্চিত মোট</Text>
        <Field value={amount} onChangeText={setAmount} placeholder="৳" keyboardType="decimal-pad" />
        <WhoWhen memberId={memberId} date={date} onMember={setMemberId} onDate={setDate} />
        <View style={{ marginTop: 16 }}>
          <Button label="বাজার সেভ" onPress={save} busy={busy} />
        </View>
      </Sheet>
    </Page>
  );
}
