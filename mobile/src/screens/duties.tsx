import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { confirm } from "../confirm";
import { addDays, dateLabel } from "../lib/dates";
import { useMess } from "../lib/store";
import { colors } from "../theme";
import { Button, Empty, FAB, Field, Group, Page, Row, Screen, Sheet, usePullReload } from "../ui";

const BATHROOM = "বাথরুম পরিষ্কার";

export function DutiesScreen() {
  const { state, me, isManager, today, activeMembers, memberById, addDuties, toggleDuty, removeDuty, say } = useMess();
  const { refreshing, onRefresh } = usePullReload();
  const [open, setOpen] = useState<"one" | "rotate" | null>(null);
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
      setOpen(null);
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
    if (ok) {
      setOpen(null);
      say(`আগামী ৩০ দিনে ${rows.length}টা পালা ঠিক হয়েছে।`);
    }
  }

  return (
    <Page>
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <Group title="সামনের পালা">
          {upcoming.length ? (
            upcoming.map((duty, index) => {
              const mine = duty.memberId === me.id;
              const person = memberById(duty.memberId);
              return (
                <Row
                  key={duty.id}
                  title={duty.name}
                  subtitle={`${duty.date === today ? "আজ" : dateLabel(duty.date)} · ${person?.name ?? "সদস্য"}`}
                  trailing={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      {(mine || isManager) && (
                        <Pressable
                          onPress={() => toggleDuty(duty.id)}
                          style={{ backgroundColor: duty.done ? "#E5F8EC" : colors.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
                        >
                          <Text style={{ color: duty.done ? colors.good : colors.purple, fontWeight: "700", fontSize: 12 }}>
                            {duty.done ? "হয়ে গেছে" : "করেছি"}
                          </Text>
                        </Pressable>
                      )}
                      {isManager && (
                        <Pressable
                          onPress={async () => {
                            if (await confirm("এই ডিউটি মুছবেন?")) removeDuty(duty.id);
                          }}
                        >
                          <Text style={{ color: colors.bad, fontWeight: "700", fontSize: 12 }}>মুছুন</Text>
                        </Pressable>
                      )}
                    </View>
                  }
                  last={index === upcoming.length - 1}
                />
              );
            })
          ) : (
            <Empty text="সামনে কোনো ডিউটি ঠিক করা নেই।" />
          )}
        </Group>
        {recent.length > 0 && (
          <Group title="গত কয়েক দিন">
            {recent.map((duty, index) => (
              <Row
                key={duty.id}
                title={duty.name}
                subtitle={dateLabel(duty.date)}
                trailing={<Text style={{ color: duty.done ? colors.good : colors.bad, fontWeight: "700" }}>{duty.done ? "হয়েছে" : "হয়নি"}</Text>}
                last={index === recent.length - 1}
              />
            ))}
          </Group>
        )}
        {!isManager && (
          <Group>
            <Row title="কীভাবে চলে" subtitle="ম্যানেজার পালা ঠিক করেন। নিজের কাজ শেষ হলে করেছি চাপুন।" last />
          </Group>
        )}
      </Screen>
      {isManager && <FAB onPress={() => setOpen("one")} />}
      <Sheet visible={open === "one"} title="নতুন ডিউটি" onClose={() => setOpen(null)}>
        <View style={{ gap: 10 }}>
          <Field value={name} onChangeText={setName} placeholder="ডিউটির নাম" maxLength={40} autoCapitalize="sentences" />
          <Pressable onPress={() => setOpenDate("one")} style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 14, elevation: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>তারিখ</Text>
            <Text style={{ marginTop: 4, fontWeight: "600" }}>{date}</Text>
          </Pressable>
          <View style={{ backgroundColor: colors.paper, borderRadius: 14, overflow: "hidden", elevation: 1 }}>
            <Picker selectedValue={memberId} onValueChange={(value) => setMemberId(String(value))}>
              {activeMembers.map((member) => (
                <Picker.Item key={member.id} label={member.name} value={member.id} />
              ))}
            </Picker>
          </View>
          <Button label="ডিউটি যোগ" onPress={addOne} busy={busy} />
          <Button label="বাথরুমের পালা ঠিক করুন" kind="ghost" onPress={() => setOpen("rotate")} />
        </View>
      </Sheet>
      <Sheet visible={open === "rotate"} title="বাথরুমের পালা" onClose={() => setOpen(null)}>
        <Pressable onPress={() => setOpenDate("start")} style={{ backgroundColor: colors.paper, borderRadius: 14, padding: 14, elevation: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>শুরু</Text>
          <Text style={{ marginTop: 4, fontWeight: "600" }}>{start}</Text>
        </Pressable>
        <View style={{ backgroundColor: colors.paper, borderRadius: 14, marginTop: 10, overflow: "hidden", elevation: 1 }}>
          <Picker selectedValue={every} onValueChange={(value) => setEvery(Number(value))}>
            {[1, 2, 3, 4, 5, 7].map((value) => (
              <Picker.Item key={value} label={value === 7 ? "সপ্তাহে একবার" : `${value} দিন`} value={value} />
            ))}
          </Picker>
        </View>
        <View style={{ marginTop: 16 }}>
          <Button label="পালা ঠিক করুন" kind="mint" busy={busy} onPress={rotate} />
        </View>
      </Sheet>
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
    </Page>
  );
}
