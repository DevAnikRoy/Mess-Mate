import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { confirm } from "../confirm";
import { addDays, dateLabel } from "../lib/dates";
import { useMess } from "../lib/store";
import { colors } from "../theme";
import { Screen, Title, usePullReload } from "../ui";

const BATHROOM = "বাথরুম পরিষ্কার";

export function DutiesScreen() {
  const { state, me, isManager, today, activeMembers, memberById, addDuties, toggleDuty, removeDuty, say } = useMess();
  const { refreshing, onRefresh } = usePullReload();
  const [name, setName] = useState("");
  const [date, setDate] = useState(addDays(today, 1));
  const [memberId, setMemberId] = useState(activeMembers[0]?.id ?? me.id);
  const [start, setStart] = useState(addDays(today, 1));
  const [every, setEvery] = useState(3);
  const [busy, setBusy] = useState(false);
  const [openDate, setOpenDate] = useState<"one" | "start" | null>(null);
  const upcoming = state.duties.filter((duty) => duty.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const recent = state.duties.filter((duty) => duty.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  async function addOne() {
    if (!name.trim()) return say("ডিউটির নাম লিখুন।");
    if (date < today) return say("আজ বা সামনের তারিখ দিন।");
    setBusy(true);
    const ok = await addDuties([{ name: name.trim().slice(0, 40), date, memberId, kind: "custom" }]);
    setBusy(false);
    if (ok) {
      setName("");
      say("ডিউটি যোগ হয়েছে।");
    }
  }

  async function rotate() {
    if (start < today) return say("আজ বা সামনের তারিখ থেকে শুরু করুন।");
    const taken = new Set(state.duties.filter((duty) => duty.kind === "bathroom").map((duty) => duty.date));
    const rows = [];
    for (let offset = 0, turn = 0; offset < 30; offset += every) {
      const day = addDays(start, offset);
      if (taken.has(day)) continue;
      rows.push({ name: BATHROOM, date: day, memberId: activeMembers[turn % activeMembers.length].id, kind: "bathroom" as const });
      turn += 1;
    }
    if (!rows.length) return say("এই সময়ে বাথরুমের পালা আগেই ঠিক করা আছে।");
    setBusy(true);
    const ok = await addDuties(rows);
    setBusy(false);
    if (ok) say(`আগামী ৩০ দিনে ${rows.length}টা পালা ঠিক হয়েছে।`);
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Title kicker="কার কবে পালা">ডিউটি</Title>
      <View style={{ gap: 8 }}>
        {upcoming.map((duty) => {
          const mine = duty.memberId === me.id;
          const person = memberById(duty.memberId);
          return (
            <View key={duty.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, borderWidth: 1, borderColor: mine ? "#D9CCFF" : colors.line, backgroundColor: mine ? "#FAF8FF" : colors.paper, paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>{duty.name}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                  {duty.date === today ? "আজ" : dateLabel(duty.date)} · {person?.name ?? "সদস্য"}
                  {mine ? " · আপনার পালা" : ""}
                </Text>
              </View>
              {(mine || isManager) && (
                <Pressable onPress={() => toggleDuty(duty.id)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: duty.done ? colors.goodBg : colors.soft }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: duty.done ? colors.good : colors.purple }}>{duty.done ? "হয়ে গেছে" : "করেছি"}</Text>
                </Pressable>
              )}
              {!mine && !isManager && duty.done && <Text style={{ fontSize: 12, fontWeight: "700", color: colors.good }}>হয়ে গেছে</Text>}
              {isManager && (
                <Pressable
                  onPress={async () => {
                    if (await confirm("এই ডিউটি মুছবেন?")) removeDuty(duty.id);
                  }}
                >
                  <Text style={{ color: colors.bad, fontSize: 12 }}>✕</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        {!upcoming.length && (
          <Text style={{ borderRadius: 22, backgroundColor: colors.wash, padding: 20, textAlign: "center", color: colors.muted }}>
            {isManager ? "সামনে কোনো ডিউটি নেই। নিচ থেকে বাথরুমের পালা বা নতুন ডিউটি যোগ করুন।" : "সামনে কোনো ডিউটি ঠিক করা নেই।"}
          </Text>
        )}
      </View>
      {recent.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: "700", color: colors.muted, marginBottom: 8 }}>গত কয়েক দিন</Text>
          {recent.map((duty) => (
            <View key={duty.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ flex: 1, fontSize: 14 }}>
                {dateLabel(duty.date)} · {duty.name} · {memberById(duty.memberId)?.short ?? "সদস্য"}
              </Text>
              <Text style={{ color: duty.done ? colors.good : colors.bad }}>{duty.done ? "হয়েছে" : "হয়নি"}</Text>
            </View>
          ))}
        </View>
      )}

      {isManager ? (
        <View style={{ gap: 16, marginTop: 20 }}>
          <View style={{ borderRadius: 24, backgroundColor: colors.mint, padding: 16 }}>
            <Text style={{ fontWeight: "700" }}>বাথরুমের পালা</Text>
            <Text style={{ color: colors.mintInk, marginTop: 4 }}>সদস্যদের মধ্যে পালাক্রমে আগামী ৩০ দিনের ভাগ করে দেবে।</Text>
            <Pressable onPress={() => setOpenDate("start")} style={whiteField}>
              <Text style={{ color: colors.mintInk, fontSize: 12 }}>শুরু</Text>
              <Text style={{ marginTop: 4, fontWeight: "600" }}>{start}</Text>
            </Pressable>
            <View style={[whiteField, { padding: 0, overflow: "hidden" }]}>
              <Picker selectedValue={every} onValueChange={(value) => setEvery(Number(value))}>
                {[1, 2, 3, 4, 5, 7].map((value) => (
                  <Picker.Item key={value} label={value === 7 ? "সপ্তাহে একবার" : `${value} দিন`} value={value} />
                ))}
              </Picker>
            </View>
            <Pressable onPress={rotate} disabled={busy} style={{ marginTop: 12, height: 44, borderRadius: 16, backgroundColor: colors.good, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>পালা ঠিক করুন</Text>
            </Pressable>
          </View>
          <View style={{ borderRadius: 24, backgroundColor: colors.wash, padding: 16 }}>
            <Text style={{ fontWeight: "700" }}>নতুন ডিউটি</Text>
            <Text style={{ color: colors.inkSoft, marginTop: 4 }}>যেমন রান্নাঘর, ছাদ, গ্যাস বিল জমা।</Text>
            <TextInput value={name} onChangeText={setName} maxLength={40} placeholder="ডিউটির নাম" placeholderTextColor={colors.muted} style={[whiteField, { color: colors.ink }]} />
            <Pressable onPress={() => setOpenDate("one")} style={whiteField}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>তারিখ</Text>
              <Text style={{ marginTop: 4, fontWeight: "600" }}>{date}</Text>
            </Pressable>
            <View style={[whiteField, { padding: 0, overflow: "hidden" }]}>
              <Picker selectedValue={memberId} onValueChange={(value) => setMemberId(String(value))}>
                {activeMembers.map((member) => (
                  <Picker.Item key={member.id} label={member.name} value={member.id} />
                ))}
              </Picker>
            </View>
            <Pressable onPress={addOne} disabled={busy} style={{ marginTop: 12, height: 44, borderRadius: 16, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>ডিউটি যোগ</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 20, borderRadius: 24, backgroundColor: colors.wash, padding: 16 }}>
          <Text style={{ fontWeight: "700" }}>কীভাবে চলে</Text>
          <Text style={{ marginTop: 8, color: colors.inkSoft, lineHeight: 22 }}>ম্যানেজার পালা ঠিক করেন। নিজের কাজ শেষ হলে "করেছি" চাপুন, সবাই দেখতে পাবে।</Text>
        </View>
      )}
      {openDate && (
        <DateTimePicker
          value={new Date(`${(openDate === "start" ? start : date)}T12:00:00`)}
          mode="date"
          onChange={(_, next) => {
            setOpenDate(null);
            if (!next) return;
            const value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
            if (openDate === "start") setStart(value);
            else setDate(value);
          }}
        />
      )}
    </Screen>
  );
}

const whiteField = {
  marginTop: 8,
  borderRadius: 16,
  backgroundColor: "#fff",
  paddingHorizontal: 12,
  paddingVertical: 10,
};
