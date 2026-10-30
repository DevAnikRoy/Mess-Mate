import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { confirm } from "../confirm";
import { dateLabel, dayOf, monthOf, monthOpen, saturdayOffset } from "../lib/dates";
import { mealText } from "../lib/format";
import { type MealMark, type Slot, SLOTS, markWeight, monthMembers, readMark } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Button, Chip, Group, Page, Row, Screen, usePullReload, ripple } from "../ui";

const none: MealMark = { b: false, l: false, d: false };
const WEEK = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র"];

export function MealsScreen() {
  const { state, mess, me, isManager, today, month, members, monthReady, ledger, saveMeal, setKitchen, addGuest, removeGuest } = useMess();
  const { refreshing, onRefresh } = usePullReload();
  const [memberId, setMemberId] = useState(me.id);
  const [picked, setPicked] = useState(today);
  const [guestSlot, setGuestSlot] = useState<Slot>(mess.slots.l ? "l" : mess.slots.d ? "d" : "b");
  const [guestCount, setGuestCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const current = monthOf(today);
  const date = picked.startsWith(month) ? picked : month === current ? today : `${month}-01`;
  const people = monthMembers(state, members, month);
  const member = people.find((item) => item.id === memberId) ?? me;
  const mark = readMark(state, member.id, date);
  const closed = state.kitchenClosed.includes(date);
  const windowOpen = monthOpen(month, today);
  const fixable = isManager && windowOpen && date <= today;
  const ownToday = member.id === me.id && date === today && !me.leftOn;
  const canEdit = !closed && (ownToday || fixable);
  const canKitchen = date === today || fixable;
  const slots = SLOTS.filter((slot) => mess.slots[slot.key] || mark?.[slot.key]);
  const guests = state.guests.filter((guest) => guest.date === date && guest.memberId === member.id);
  const days = ledger.days;
  const monthMeals = ledger.rows.find((row) => row.member.id === member.id)?.meals ?? 0;

  async function update(next: MealMark) {
    if (!canEdit || busy) return;
    setBusy(true);
    await saveMeal(member.id, date, next);
    setBusy(false);
  }

  async function toggleKitchen() {
    if (!canKitchen || busy) return;
    if (!closed && !(await confirm(`${dateLabel(date)} রান্না বন্ধ? সেদিনের সবার মিল হিসাবে ধরা হবে না।`))) return;
    setBusy(true);
    await setKitchen(date, !closed);
    setBusy(false);
  }

  let status = "এখনো দেননি";
  if (closed) status = "রান্না নেই";
  else if (mark) status = markWeight(mark) ? `${mealText(markWeight(mark))} মিল` : "খাবে না";

  return (
    <Page>
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <MonthPicker />
        {people.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
            {people.map((item) => (
              <Chip key={item.id} label={item.id === me.id ? "আমি" : item.short} active={member.id === item.id} onPress={() => setMemberId(item.id)} />
            ))}
          </ScrollView>
        )}
        {!monthReady(month) ? (
          <MonthLoading />
        ) : (
          <>
            <View style={{ backgroundColor: colors.paper, borderRadius: 16, padding: 10, marginTop: 12, elevation: 1 }}>
              <View style={{ flexDirection: "row" }}>
                {WEEK.map((label) => (
                  <Text key={label} style={{ width: "14.28%", textAlign: "center", color: colors.muted, fontSize: 11, marginBottom: 6 }}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {Array.from({ length: saturdayOffset(month) }, (_, index) => (
                  <View key={`b-${index}`} style={{ width: "14.28%" }} />
                ))}
                {Array.from({ length: days }, (_, index) => {
                  const key = dayOf(month, index + 1);
                  const off = state.kitchenClosed.includes(key);
                  const value = readMark(state, member.id, key);
                  const active = key === date;
                  const future = key > today;
                  return (
                    <Pressable
                      key={key}
                      disabled={future}
                      onPress={() => setPicked(key)}
                      android_ripple={ripple}
                      style={{ width: "14.28%", padding: 2, opacity: future ? 0.35 : 1 }}
                    >
                      <View
                        style={{
                          borderRadius: 12,
                          paddingVertical: 7,
                          backgroundColor: active ? colors.purple : key === today ? colors.soft : "transparent",
                        }}
                      >
                        <Text style={{ textAlign: "center", fontWeight: "700", color: active ? "#fff" : colors.ink }}>{index + 1}</Text>
                        <Text style={{ textAlign: "center", fontSize: 10, color: active ? "rgba(255,255,255,0.85)" : colors.muted }}>
                          {off ? "বন্ধ" : value ? mealText(markWeight(value)) : "—"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ backgroundColor: colors.paper, borderRadius: 16, padding: 16, marginTop: 12, elevation: 1 }}>
              <Text style={{ color: colors.muted }}>{date === today ? "আজ" : dateLabel(date)} · {member.name}</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", marginTop: 2 }}>{status}</Text>
              <Text style={{ color: colors.muted, marginTop: 2 }}>এই মাসে {mealText(monthMeals)} মিল</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
                {slots.map((slot) => {
                  const on = Boolean(mark?.[slot.key]);
                  return (
                    <Pressable
                      key={slot.key}
                      disabled={!canEdit || busy}
                      onPress={() => update({ ...(mark ?? none), [slot.key]: !on })}
                      android_ripple={ripple}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        paddingVertical: 14,
                        backgroundColor: on ? colors.purple : colors.bg,
                        opacity: !canEdit ? 0.45 : 1,
                      }}
                    >
                      <Text style={{ textAlign: "center", fontWeight: "800", color: on ? "#fff" : colors.ink }}>{slot.label}</Text>
                      <Text style={{ textAlign: "center", color: on ? "rgba(255,255,255,0.8)" : colors.muted, fontSize: 11, marginTop: 2 }}>
                        {slot.weight} মিল
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Button label={date === today ? "আজ খাব না" : "খায়নি"} kind="dark" disabled={!canEdit || busy} onPress={() => update(none)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={closed ? "রান্না চালু" : "রান্না নেই"} kind="ghost" disabled={!canKitchen || busy} onPress={toggleKitchen} />
                </View>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Group title="অতিথির মিল">
                <View style={{ padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {SLOTS.filter((slot) => mess.slots[slot.key]).map((slot) => (
                      <Chip key={slot.key} label={slot.label} active={guestSlot === slot.key} onPress={() => setGuestSlot(slot.key)} />
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 }}>
                    <Pressable onPress={() => setGuestCount((value) => Math.max(1, value - 1))} android_ripple={ripple} style={stepper}>
                      <Text style={{ fontSize: 22, fontWeight: "700" }}>−</Text>
                    </Pressable>
                    <Text style={{ fontSize: 24, fontWeight: "800", minWidth: 32, textAlign: "center" }}>{guestCount}</Text>
                    <Pressable onPress={() => setGuestCount((value) => Math.min(20, value + 1))} android_ripple={ripple} style={stepper}>
                      <Text style={{ fontSize: 22, fontWeight: "700" }}>+</Text>
                    </Pressable>
                  </View>
                  <Button
                    label="অতিথি যোগ"
                    disabled={!canEdit || busy}
                    onPress={async () => {
                      setBusy(true);
                      await addGuest({ memberId: member.id, date, slot: guestSlot, count: guestCount });
                      setBusy(false);
                    }}
                  />
                </View>
                {guests.map((item, index) => (
                  <Row
                    key={item.id}
                    title={`${item.count} জন`}
                    subtitle={SLOTS.find((slot) => slot.key === item.slot)?.label}
                    trailing={
                      canEdit ? (
                        <Pressable onPress={() => removeGuest(item.id)}>
                          <Text style={{ color: colors.bad, fontWeight: "700" }}>মুছুন</Text>
                        </Pressable>
                      ) : undefined
                    }
                    last={index === guests.length - 1}
                  />
                ))}
              </Group>
            </View>
          </>
        )}
      </Screen>
    </Page>
  );
}

const stepper = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.paper,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  elevation: 1,
};
