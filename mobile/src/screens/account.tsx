import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useSession } from "../lib/session";
import { useMaybeMess } from "../lib/store";
import { createClient } from "../lib/supabase";
import { useReload } from "../providers";
import { colors } from "../theme";
import { Avatar, Button, ErrorText, Field, Screen } from "../ui";

export function AccountScreen() {
  const session = useSession();
  const store = useMaybeMess();
  const reload = useReload();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(session?.name ?? "");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  async function leave() {
    setBusy(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setBusy(false);
  }

  async function rename() {
    const trimmed = name.trim().slice(0, 60);
    const supabase = createClient();
    if (!supabase || !session) return;
    if (!trimmed) return setError("নাম খালি রাখা যাবে না।");
    setBusy(true);
    setError("");
    setSaved("");
    const [{ error: profileError }] = await Promise.all([
      supabase.from("profiles").update({ full_name: trimmed, updated_at: new Date().toISOString() }).eq("id", session.id),
      supabase.auth.updateUser({ data: { full_name: trimmed } }),
    ]);
    setBusy(false);
    if (profileError) return setError("নাম সেভ করা যায়নি। আবার চেষ্টা করুন।");
    setSaved("নাম সেভ হয়েছে।");
    await reload();
  }

  if (!session) {
    return (
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>প্রোফাইল</Text>
        <Text style={{ color: colors.muted, marginTop: 8 }}>প্রোফাইল দেখতে আগে ঢুকুন।</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ borderRadius: 28, backgroundColor: colors.paper, padding: 8 }}>
        <Avatar name={session.name} src={session.avatarUrl} size={96} />
        <Text style={{ fontSize: 24, fontWeight: "600", marginTop: 16 }}>{session.name}</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>{session.email}</Text>
        <View style={{ alignSelf: "flex-start", marginTop: 12, backgroundColor: colors.soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: colors.purple, fontWeight: "700", fontSize: 12 }}>{session.provider === "google" ? "গুগল" : "ইমেইল"}</Text>
        </View>
        <Text style={{ marginTop: 24, color: colors.inkSoft }}>মেসে যে নামে দেখাবে</Text>
        <View style={{ marginTop: 8 }}>
          <Field value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" />
        </View>
        <ErrorText>{error}</ErrorText>
        {saved ? <Text style={{ color: colors.good, marginTop: 8 }}>{saved}</Text> : null}
        <View style={{ marginTop: 16, alignSelf: "flex-start" }}>
          <Button label="নাম সেভ" disabled={!name.trim() || name.trim() === session.name} busy={busy} onPress={rename} />
        </View>
        {!store && (
          <Text onPress={() => router.push("/onboarding")} style={{ marginTop: 20, color: colors.purple, fontWeight: "700" }}>
            মেস খুলুন বা যোগ দিন
          </Text>
        )}
        <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
          <Button label="বের হন" kind="dark" busy={busy} onPress={leave} />
        </View>
      </View>
    </Screen>
  );
}
