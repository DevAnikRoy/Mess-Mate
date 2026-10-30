import { useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { confirm, shareText } from "../confirm";
import { dateLabel } from "../lib/dates";
import { explain } from "../lib/errors";
import type { MealMark, Member } from "../lib/model";
import { useMess } from "../lib/store";
import { createClient } from "../lib/supabase";
import { useReload } from "../providers";
import { SlotPicker } from "./onboarding";
import { colors } from "../theme";
import { Avatar, Button, Field, Group, Row, Screen, usePullReload } from "../ui";

export function MessScreen() {
  const { mess, members, me, isManager, say } = useMess();
  const reload = useReload();
  const { refreshing, onRefresh } = usePullReload();
  const welcome = useLocalSearchParams<{ welcome?: string }>().welcome === "1";
  const [code, setCode] = useState(mess.inviteCode);
  const [name, setName] = useState(mess.name);
  const [slots, setSlots] = useState<MealMark>(mess.slots);
  const [busy, setBusy] = useState<string | null>(null);
  const active = members.filter((member) => !member.leftOn);
  const former = members.filter((member) => member.leftOn);
  const link = `https://messmate.app/join/${code}`;
  const dirty = name.trim() !== mess.name || slots.b !== mess.slots.b || slots.l !== mess.slots.l || slots.d !== mess.slots.d;

  async function copy(text: string) {
    await Clipboard.setStringAsync(text);
    say("কপি হয়েছে।");
  }

  async function regenerate() {
    const supabase = createClient();
    if (!supabase) return;
    if (!(await confirm("পুরনো কোড আর কাজ করবে না। নতুন কোড বানাবেন?"))) return;
    setBusy("code");
    const { data, error } = await supabase.rpc("regenerate_invite", { p_mess: mess.id });
    setBusy(null);
    if (error) return say(explain(error));
    setCode(String(data));
    say("নতুন কোড তৈরি হয়েছে।");
  }

  async function save() {
    const supabase = createClient();
    if (!supabase) return;
    const trimmed = name.trim();
    if (!trimmed) return say("মেসের নাম খালি রাখা যাবে না।");
    setBusy("save");
    const { error } = await supabase.from("messes").update({ name: trimmed, breakfast: slots.b, lunch: slots.l, dinner: slots.d }).eq("id", mess.id);
    setBusy(null);
    if (error) return say(explain(error));
    say("মেসের তথ্য সেভ হয়েছে।");
    await reload();
  }

  function memberActions(member: Member) {
    if (!isManager || member.id === me.id) {
      router.push(`/members/${member.id}`);
      return;
    }
    Alert.alert(member.name, undefined, [
      { text: "হিসাব দেখুন", onPress: () => router.push(`/members/${member.id}`) },
      { text: "ম্যানেজার বানান", onPress: () => makeManager(member) },
      { text: "বাদ দিন", style: "destructive", onPress: () => remove(member) },
      { text: "বাতিল", style: "cancel" },
    ]);
  }

  async function makeManager(member: Member) {
    const supabase = createClient();
    if (!supabase) return;
    if (!(await confirm(`${member.name} কে ম্যানেজার বানাবেন? আপনি সাধারণ সদস্য হয়ে যাবেন।`))) return;
    setBusy(`m-${member.id}`);
    const { error } = await supabase.rpc("transfer_manager", { p_mess: mess.id, p_user: member.id });
    setBusy(null);
    if (error) return say(explain(error));
    say("ম্যানেজার বদল হয়েছে।");
    await reload();
  }

  async function remove(member: Member) {
    const supabase = createClient();
    if (!supabase) return;
    if (!(await confirm(`${member.name} কে মেস থেকে বাদ দেবেন? তার আগের হিসাব রিপোর্টে থেকে যাবে।`))) return;
    setBusy(`r-${member.id}`);
    const { error } = await supabase.rpc("remove_member", { p_mess: mess.id, p_user: member.id });
    setBusy(null);
    if (error) return say(explain(error));
    say("সদস্য বাদ দেওয়া হয়েছে।");
    await reload();
  }

  async function leave() {
    const supabase = createClient();
    if (!supabase) return;
    if (!(await confirm("মেস ছেড়ে দেবেন? আপনার আগের হিসাব রিপোর্টে থেকে যাবে।"))) return;
    setBusy("leave");
    const { error } = await supabase.rpc("leave_mess", { p_mess: mess.id });
    setBusy(null);
    if (error) return say(explain(error));
    await reload();
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      {welcome && isManager && (
        <View style={{ backgroundColor: colors.mint, borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontWeight: "700" }}>মেস খোলা হয়েছে</Text>
          <Text style={{ color: colors.mintInk, marginTop: 4 }}>নিচের কোড সদস্যদের পাঠান।</Text>
        </View>
      )}
      {isManager && (
        <View style={{ backgroundColor: colors.purple, borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)" }}>ইনভাইট কোড</Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 4, marginTop: 6 }}>{code}</Text>
          <View style={{ gap: 8, marginTop: 14 }}>
            <Button label="লিংক পাঠান" kind="ghost" onPress={() => shareText(`${mess.name} মেসে যোগ দিতে: ${link}\nকোড: ${code}`)} />
            <Button label="কোড কপি" kind="ghost" onPress={() => copy(code)} />
            <Button label="নতুন কোড" kind="ghost" busy={busy === "code"} onPress={regenerate} />
          </View>
        </View>
      )}
      <Group title={`সদস্য (${active.length} জন)`}>
        {active.map((member, index) => (
          <Row
            key={member.id}
            title={`${member.name}${member.id === me.id ? " (আপনি)" : ""}`}
            subtitle={`${member.role === "manager" ? "ম্যানেজার" : "সদস্য"} · ${dateLabel(member.joinedOn)} থেকে`}
            leading={<Avatar name={member.name} src={member.avatarUrl} size={40} />}
            onPress={() => memberActions(member)}
            last={index === active.length - 1}
          />
        ))}
      </Group>
      {former.length > 0 && (
        <Group title="আগের সদস্য">
          <Row title={former.map((member) => member.name).join(", ")} last />
        </Group>
      )}
      {isManager && (
        <Group title="মেস সেটিংস">
          <View style={{ padding: 16, gap: 12 }}>
            <Field value={name} onChangeText={(value) => setName(value.slice(0, 60))} autoCapitalize="words" />
            <SlotPicker value={slots} onChange={setSlots} />
            <Button label="সেভ করুন" disabled={!dirty} busy={busy === "save"} onPress={save} />
          </View>
        </Group>
      )}
      <Group title="মেস ছাড়ুন">
        <Row
          title={isManager ? "ম্যানেজার মেস ছাড়তে পারেন না" : "মেস ছাড়ুন"}
          subtitle={isManager ? "আগে অন্য কাউকে ম্যানেজার বানান।" : "আগের হিসাব রিপোর্টে থেকে যাবে।"}
          danger={!isManager}
          onPress={isManager ? undefined : leave}
          last
        />
      </Group>
    </Screen>
  );
}
