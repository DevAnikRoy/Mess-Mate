import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { confirm } from "./confirm";
import { addMonths, monthOf, monthOpen } from "./lib/dates";
import { parseAmount } from "./lib/format";
import { useMess } from "./lib/store";
import { colors } from "./theme";
import { Field } from "./ui";

export function useEditFloor() {
  const { today, mess } = useMess();
  const current = monthOf(today);
  const previous = addMonths(current, -1);
  const floor = monthOpen(previous, today) ? `${previous}-01` : `${current}-01`;
  return floor < mess.createdOn.slice(0, 8) + "01" ? mess.createdOn.slice(0, 8) + "01" : floor;
}

export function useCanChange() {
  const { me, isManager, today } = useMess();
  return (row: { date: string; createdBy: string }) =>
    (isManager && monthOpen(monthOf(row.date), today) && row.date <= today) || (row.createdBy === me.id && row.date === today && !me.leftOn);
}

export function WhoWhen({
  memberId,
  date,
  onMember,
  onDate,
}: {
  memberId: string;
  date: string;
  onMember: (id: string) => void;
  onDate: (date: string) => void;
}) {
  const { isManager, activeMembers } = useMess();
  const [open, setOpen] = useState(false);
  if (!isManager) return null;
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>কে দিয়েছে</Text>
      <View style={{ backgroundColor: colors.field, borderRadius: 16, overflow: "hidden" }}>
        <Picker selectedValue={memberId} onValueChange={(value) => onMember(String(value))}>
          {activeMembers.map((member) => (
            <Picker.Item key={member.id} label={member.name} value={member.id} />
          ))}
        </Picker>
      </View>
      <Pressable onPress={() => setOpen(true)} style={{ backgroundColor: colors.field, borderRadius: 16, padding: 14 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>তারিখ</Text>
        <Text style={{ color: colors.ink, fontSize: 16, marginTop: 4, fontWeight: "600" }}>{date}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={new Date(`${date}T12:00:00`)}
          mode="date"
          onChange={(_, next) => {
            setOpen(false);
            if (next) onDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`);
          }}
        />
      )}
    </View>
  );
}

export function EntryActions({ amount, onSave, onDelete }: { amount: number; onSave: (value: number) => Promise<boolean>; onDelete: () => Promise<boolean> }) {
  const { say } = useMess();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [busy, setBusy] = useState(false);

  async function save() {
    const parsed = parseAmount(value);
    if (parsed == null) return say("সঠিক টাকার অঙ্ক দিন।");
    setBusy(true);
    const ok = await onSave(parsed);
    setBusy(false);
    if (ok) setEditing(false);
  }

  async function remove() {
    if (!(await confirm("এই হিসাবটা মুছে ফেলবেন?"))) return;
    setBusy(true);
    await onDelete();
    setBusy(false);
  }

  if (editing) {
    return (
      <View style={{ marginTop: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Field value={value} onChangeText={setValue} keyboardType="decimal-pad" />
        </View>
        <Pressable onPress={save} disabled={busy}>
          <Text style={{ color: colors.purple, fontWeight: "700" }}>সেভ</Text>
        </Pressable>
        <Pressable onPress={() => setEditing(false)}>
          <Text style={{ color: colors.muted }}>বাতিল</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10, flexDirection: "row", gap: 18 }}>
      <Pressable onPress={() => { setValue(String(amount)); setEditing(true); }}>
        <Text style={{ color: colors.purple, fontWeight: "700", fontSize: 13 }}>টাকা বদলান</Text>
      </Pressable>
      <Pressable onPress={remove} disabled={busy}>
        <Text style={{ color: colors.bad, fontWeight: "700", fontSize: 13 }}>মুছুন</Text>
      </Pressable>
    </View>
  );
}
