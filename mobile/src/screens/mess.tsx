import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { confirm, shareText } from "../confirm";
import { IconCopy } from "../icons";
import { dateLabel } from "../lib/dates";
import { explain } from "../lib/errors";
import type { MealMark, Member } from "../lib/model";
import { useMess } from "../lib/store";
import { createClient } from "../lib/supabase";
import { useReload } from "../providers";
import { SlotPicker } from "./onboarding";
import { colors } from "../theme";
import { Avatar, Screen, usePullReload } from "../ui";

const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://mess-mate-beryl.vercel.app").replace(/\/$/, "");

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
  const link = `${SITE}/join/${code}`;
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
      <Text style={{ color: colors.muted, fontSize: 12 }}>মেস ও সদস্য</Text>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 16 }}>{mess.name}</Text>
      {welcome && isManager && (
        <View style={{ backgroundColor: colors.mint, borderRadius: 24, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700" }}>মেস খোলা হয়েছে</Text>
          <Text style={{ color: colors.mintInk, marginTop: 4, lineHeight: 22 }}>নিচের লিংক বা কোড সদস্যদের পাঠান। তারা নিজের গুগল বা ইমেইল দিয়ে ঢুকে যোগ দেবে।</Text>
        </View>
      )}
      {isManager && (
        <View style={{ backgroundColor: colors.purple, borderRadius: 28, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)" }}>ইনভাইট কোড</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", letterSpacing: 4 }}>{code}</Text>
            <Pressable onPress={() => copy(code)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <IconCopy />
            </Pressable>
          </View>
          <Text style={{ marginTop: 12, color: "#fff", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 16, padding: 10, fontSize: 12 }}>{link}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            <Pressable onPress={() => shareText(`${mess.name} মেসে যোগ দিতে এই লিংকে ঢুকুন: ${link}\nকোড: ${code}`)} style={inviteBtn("#fff")}>
              <Text style={{ color: colors.purple, fontWeight: "700" }}>লিংক পাঠান</Text>
            </Pressable>
            <Pressable onPress={() => copy(link)} style={inviteBtn("rgba(255,255,255,0.2)")}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>লিংক কপি</Text>
            </Pressable>
            <Pressable onPress={regenerate} disabled={busy === "code"} style={inviteBtn("rgba(255,255,255,0.1)")}>
              <Text style={{ color: "#fff" }}>{busy === "code" ? "হচ্ছে…" : "নতুন কোড"}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={{ borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "700" }}>সদস্য ({active.length} জন)</Text>
          {!isManager && <Text style={{ fontSize: 12, color: colors.muted }}>কোড লাগলে ম্যানেজারকে বলুন</Text>}
        </View>
        {active.map((member) => (
          <View key={member.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Avatar name={member.name} src={member.avatarUrl} size={44} />
            <Pressable onPress={() => router.push(`/members/${member.id}`)} style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }} numberOfLines={1}>
                {member.name}
                {member.id === me.id ? <Text style={{ fontWeight: "400", color: colors.muted }}> (আপনি)</Text> : null}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {member.role === "manager" ? "ম্যানেজার" : "সদস্য"} · {dateLabel(member.joinedOn)} থেকে
              </Text>
            </Pressable>
            {isManager && member.id !== me.id && (
              <View style={{ gap: 6 }}>
                <Pressable onPress={() => makeManager(member)} disabled={busy !== null} style={{ backgroundColor: colors.soft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: colors.purple, fontSize: 12, fontWeight: "700" }}>ম্যানেজার</Text>
                </Pressable>
                <Pressable onPress={() => remove(member)} disabled={busy !== null} style={{ backgroundColor: colors.badBg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: colors.bad, fontSize: 12, fontWeight: "700" }}>বাদ দিন</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
        {former.length > 0 && <Text style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>আগের সদস্য: {former.map((member) => member.name).join(", ")}</Text>}
      </View>
      {isManager && (
        <View style={{ borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700" }}>মেস সেটিংস</Text>
          <Text style={{ marginTop: 16, color: colors.inkSoft }}>মেসের নাম</Text>
          <TextInput value={name} onChangeText={(value) => setName(value.slice(0, 60))} style={{ marginTop: 8, height: 48, borderRadius: 16, backgroundColor: colors.field, paddingHorizontal: 16, color: colors.ink }} />
          <Text style={{ marginTop: 16, marginBottom: 12, color: colors.inkSoft }}>যে বেলাগুলোতে রান্না হয়</Text>
          <SlotPicker value={slots} onChange={setSlots} />
          <Pressable onPress={save} disabled={!dirty || busy === "save"} style={{ marginTop: 16, height: 44, borderRadius: 16, backgroundColor: colors.purple, alignSelf: "flex-start", paddingHorizontal: 20, alignItems: "center", justifyContent: "center", opacity: !dirty ? 0.5 : 1 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>{busy === "save" ? "সেভ হচ্ছে…" : "সেভ করুন"}</Text>
          </Pressable>
        </View>
      )}
      <View style={{ borderRadius: 28, backgroundColor: "#FFF7F5", padding: 16 }}>
        <Text style={{ fontWeight: "700" }}>মেস ছাড়ুন</Text>
        <Text style={{ marginTop: 4, color: colors.muted, lineHeight: 22 }}>
          {isManager
            ? active.length > 1
              ? "ম্যানেজার মেস ছাড়তে পারেন না। আগে অন্য কাউকে ম্যানেজার বানান।"
              : "আপনি একাই আছেন। মেস ছাড়তে হলে আগে আরেকজনকে যুক্ত করে ম্যানেজার বানান।"
            : "ছেড়ে দিলে নতুন কিছু লিখতে পারবেন না, তবে আগের হিসাব রিপোর্টে থেকে যাবে।"}
        </Text>
        {!isManager && (
          <Pressable onPress={leave} disabled={busy === "leave"} style={{ marginTop: 16, height: 44, borderRadius: 16, backgroundColor: colors.dark, alignSelf: "flex-start", paddingHorizontal: 20, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>মেস ছাড়ুন</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

function inviteBtn(backgroundColor: string) {
  return { height: 44, borderRadius: 16, backgroundColor, paddingHorizontal: 16, alignItems: "center" as const, justifyContent: "center" as const };
}
