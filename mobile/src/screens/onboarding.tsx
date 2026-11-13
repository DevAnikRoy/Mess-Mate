import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { explain } from "../lib/errors";
import { type MealMark, SLOTS } from "../lib/model";
import { greetingName } from "../lib/profile";
import { useSession } from "../lib/session";
import { createClient } from "../lib/supabase";
import { useReload } from "../providers";
import { colors } from "../theme";
import { Avatar, Button, ErrorText, Field, Screen, ripple } from "../ui";

export function SlotPicker({ value, onChange }: { value: MealMark; onChange: (next: MealMark) => void }) {
  const on = SLOTS.filter((slot) => value[slot.key]).length;
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {SLOTS.map((slot) => {
        const active = value[slot.key];
        const locked = active && on === 1;
        return (
          <Pressable
            key={slot.key}
            disabled={locked}
            onPress={() => onChange({ ...value, [slot.key]: !active })}
            android_ripple={ripple}
            style={{
              flex: 1,
              borderRadius: 14,
              padding: 12,
              backgroundColor: active ? colors.soft : colors.paper,
              borderWidth: 1,
              borderColor: active ? colors.purple : "#EEE8F8",
            }}
          >
            <Text style={{ fontWeight: "700", color: active ? colors.purple : colors.inkSoft }}>{slot.label}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{slot.weight} মিল</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function normalizeCode(raw: string) {
  const fromLink = raw.match(/join\/([A-Za-z0-9]+)/);
  return (fromLink ? fromLink[1] : raw).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
}

export function JoinBox({ initialCode = "" }: { initialCode?: string }) {
  const reload = useReload();
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [preview, setPreview] = useState<{ name: string; members: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (code.length < 6) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      if (!supabase) return;
      setChecking(true);
      const { data, error: rpcError } = await supabase.rpc("invite_preview", { p_code: code });
      if (!alive) return;
      setChecking(false);
      const row = Array.isArray(data) ? (data[0] as { name: string; members: number } | undefined) : undefined;
      if (rpcError || !row) {
        setPreview(null);
        setError("এই কোডে কোনো মেস পাওয়া যায়নি।");
      } else {
        setPreview(row);
        setError("");
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code]);

  async function join() {
    const supabase = createClient();
    if (!supabase || code.length < 6) return;
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("join_mess", { p_code: code });
    if (rpcError) {
      setError(explain(rpcError));
      setBusy(false);
      return;
    }
    await reload();
  }

  return (
    <View style={{ gap: 10 }}>
      <Field value={code} onChangeText={(value) => { setCode(normalizeCode(value)); setPreview(null); setError(""); }} placeholder="যেমন: 7F3A9C21" autoCapitalize="characters" />
      {preview && (
        <View style={{ backgroundColor: colors.mint, borderRadius: 14, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>{preview.name}</Text>
          <Text style={{ color: colors.mintInk }}>{preview.members} জন সদস্য আছেন</Text>
        </View>
      )}
      {checking && !preview ? <Text style={{ color: colors.muted }}>মেস খোঁজা হচ্ছে…</Text> : null}
      <ErrorText>{error}</ErrorText>
      <Button label={preview ? `${preview.name}-এ যোগ দিন` : "যোগ দিন"} kind="dark" onPress={join} busy={busy} disabled={!preview} />
    </View>
  );
}

export function OnboardingScreen() {
  const session = useSession();
  const reload = useReload();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [slots, setSlots] = useState<MealMark>({ b: true, l: true, d: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return setError("মেসের একটা নাম দিন।");
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("create_mess", {
      p_name: trimmed,
      p_breakfast: slots.b,
      p_lunch: slots.l,
      p_dinner: slots.d,
    });
    if (rpcError) {
      setError(explain(rpcError));
      setBusy(false);
      return;
    }
    await reload();
  }

  return (
    <Screen canvas={colors.bg}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "700" }}>মেসমেট</Text>
        <Pressable onPress={() => router.push("/account")}>
          <Avatar name={session?.name ?? "স"} src={session?.avatarUrl ?? null} size={40} />
        </Pressable>
      </View>
      <View style={{ marginTop: 24, borderRadius: 32, backgroundColor: colors.paper, overflow: "hidden" }}>
        <View style={{ backgroundColor: colors.purple, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)" }}>স্বাগতম{session ? `, ${greetingName(session.name)}` : ""}</Text>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 4 }}>আপনার মেসের হিসাব শুরু করুন</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 8, lineHeight: 22 }}>নিজে মেস খুলে ম্যানেজার হন, অথবা ম্যানেজারের দেওয়া কোড দিয়ে যোগ দিন।</Text>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 28, paddingTop: 20 }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.field, borderRadius: 999, padding: 4 }}>
            <Pressable onPress={() => setMode("create")} style={{ flex: 1, borderRadius: 999, paddingVertical: 10, backgroundColor: mode === "create" ? colors.paper : "transparent" }}>
              <Text style={{ textAlign: "center", color: mode === "create" ? colors.purple : colors.muted, fontWeight: mode === "create" ? "700" : "400" }}>নতুন মেস খুলুন</Text>
            </Pressable>
            <Pressable onPress={() => setMode("join")} style={{ flex: 1, borderRadius: 999, paddingVertical: 10, backgroundColor: mode === "join" ? colors.paper : "transparent" }}>
              <Text style={{ textAlign: "center", color: mode === "join" ? colors.purple : colors.muted, fontWeight: mode === "join" ? "700" : "400" }}>কোড দিয়ে যোগ দিন</Text>
            </Pressable>
          </View>
          {mode === "create" ? (
            <View style={{ gap: 16, marginTop: 24 }}>
              <View>
                <Text style={{ fontWeight: "600", marginBottom: 8 }}>মেসের নাম</Text>
                <Field value={name} onChangeText={(value) => setName(value.slice(0, 60))} placeholder="যেমন: শান্তিনগর বয়েজ মেস" autoCapitalize="words" />
              </View>
              <View>
                <Text style={{ fontWeight: "600" }}>কোন কোন বেলা রান্না হয়?</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 12 }}>পরে মেস সেটিংস থেকে বদলানো যাবে।</Text>
                <SlotPicker value={slots} onChange={setSlots} />
              </View>
              <Text style={{ backgroundColor: colors.wash, borderRadius: 16, padding: 12, color: colors.inkSoft, fontSize: 12, lineHeight: 18 }}>
                আপনি হবেন এই মেসের ম্যানেজার। মেস খোলার পর একটা ইনভাইট কোড পাবেন, সেটা সদস্যদের পাঠালেই তারা যুক্ত হতে পারবে।
              </Text>
              <ErrorText>{error}</ErrorText>
              <Button label={busy ? "মেস খোলা হচ্ছে…" : "মেস খুলুন"} onPress={create} busy={busy} />
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: colors.inkSoft, marginBottom: 12 }}>ম্যানেজারের কাছ থেকে পাওয়া ৮ অক্ষরের কোড বা লিংক বসান।</Text>
              <JoinBox />
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}
