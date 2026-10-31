import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { EntryActions, WhoWhen, useCanChange } from "../entry-tools";
import { dateLabel, monthName } from "../lib/dates";
import { parseAmount, taka } from "../lib/format";
import { monthMembers, suggestTotal } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Screen, Title, usePullReload } from "../ui";

export function BazaarScreen() {
  const { state, me, today, month, members, monthReady, memberById, addBazaar, updateAmount, removeEntry, say } = useMess();
  const canChange = useCanChange();
  const { refreshing, onRefresh } = usePullReload();
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

  async function save() {
    const value = parseAmount(amount);
    if (value == null) return say("নিশ্চিত মোট টাকা লিখুন।");
    if (!note.trim()) return say("কী কী কিনেছেন সেটা লিখুন।");
    setBusy(true);
    const ok = await addBazaar({ memberId, date, note: note.trim().slice(0, 2000), amount: value });
    setBusy(false);
    if (!ok) return;
    setNote("");
    setAmount("");
    setGuess(null);
    setMemberId(me.id);
    setDate(today);
    say("বাজার সেভ হয়েছে।");
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Title kicker="খাতার মতো লিখুন">বাজার</Title>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={2000}
        placeholder={"যেমন:\nচাল ৫ কেজি ৩৫০\nসবজি ১৮০\nমাছ ৪২০"}
        placeholderTextColor={colors.muted}
        style={{ minHeight: 180, borderRadius: 24, backgroundColor: "#F7F5FC", padding: 16, color: colors.ink, fontSize: 14, lineHeight: 22, textAlignVertical: "top" }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <Pressable onPress={preview} disabled={!note.trim()} style={{ borderRadius: 999, backgroundColor: colors.soft, paddingHorizontal: 16, paddingVertical: 8, opacity: note.trim() ? 1 : 0.5 }}>
          <Text style={{ color: colors.purple, fontWeight: "700" }}>অঙ্ক বের করো</Text>
        </Pressable>
        {guess != null && <Text style={{ color: colors.muted, fontSize: 14 }}>লেখা থেকে {taka(guess)} পাওয়া গেছে</Text>}
      </View>
      <Text style={{ marginTop: 16, marginBottom: 6, fontSize: 14 }}>নিশ্চিত মোট</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="৳"
        placeholderTextColor={colors.muted}
        style={{ height: 48, borderRadius: 16, backgroundColor: "#F7F5FC", paddingHorizontal: 16, fontSize: 18, fontWeight: "700", color: colors.ink }}
      />
      <WhoWhen memberId={memberId} date={date} onMember={setMemberId} onDate={setDate} />
      <Pressable onPress={save} disabled={busy} style={{ marginTop: 12, height: 48, borderRadius: 16, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>{busy ? "সেভ হচ্ছে…" : "বাজার সেভ"}</Text>
      </Pressable>
      <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        হিসাবে শুধু এই নিশ্চিত টাকা ঢুকবে। আসল লেখা রয়ে যাবে। আজকের মধ্যে নিজে বদলাতে পারবেন, পরে ম্যানেজার।
      </Text>

      <View style={{ marginTop: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Text style={{ fontWeight: "700", flex: 1 }}>{monthName(month)} মাসের বাজার</Text>
          <MonthPicker />
        </View>
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <View style={{ backgroundColor: colors.dark, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>মোট বাজার</Text>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{taka(total)}</Text>
            </View>
            {people.map((member) => {
              const sum = rows.filter((row) => row.memberId === member.id).reduce((value, row) => value + row.amount, 0);
              return (
                <View key={member.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <Text>{member.id === me.id ? "আমি" : member.name}</Text>
                  <Text style={{ fontWeight: "700" }}>{taka(sum)}</Text>
                </View>
              );
            })}
            <View style={{ marginTop: 12, gap: 12 }}>
              {rows.map((row) => (
                <View key={row.id} style={{ borderRadius: 16, padding: 12, backgroundColor: row.memberId === me.id ? "#F4EFFF" : "#FAF8FF" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={1}>
                      {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                    </Text>
                    <Text style={{ fontWeight: "700" }}>{taka(row.amount)}</Text>
                  </View>
                  <Text style={{ marginTop: 4, lineHeight: 20 }}>{row.note}</Text>
                  {canChange(row) && (
                    <EntryActions amount={row.amount} onSave={(value) => updateAmount("bazaar", row.id, value)} onDelete={() => removeEntry("bazaar", row.id)} />
                  )}
                </View>
              ))}
              {!rows.length && <Text style={{ textAlign: "center", color: colors.muted, paddingVertical: 24 }}>এই মাসে এখনো কোনো বাজার লেখা হয়নি।</Text>}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
