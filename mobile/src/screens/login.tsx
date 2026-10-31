import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as WebBrowser from "expo-web-browser";
import { signInWithGoogle, webRedirect } from "../lib/auth";
import { createClient, supabaseConfigured } from "../lib/supabase";
import { colors } from "../theme";
import { Button, ErrorText, Field, Screen } from "../ui";

WebBrowser.maybeCompleteAuthSession();

function authError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid credentials")) return "ইমেইল বা পাসওয়ার্ড মিলছে না।";
  if (text.includes("already registered") || text.includes("already been registered")) return "এই ইমেইলে আগেই অ্যাকাউন্ট আছে। ঢুকুন।";
  if (text.includes("password")) return "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।";
  if (text.includes("email not confirmed")) return "আগে ইমেইলের লিংক থেকে অ্যাকাউন্ট নিশ্চিত করুন।";
  if (text.includes("rate limit")) return "একটু পরে আবার চেষ্টা করুন।";
  return "ঢোকা যায়নি। একটু পরে আবার চেষ্টা করুন।";
}

export function LoginScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function withGoogle() {
    setBusy(true);
    setError("");
    try {
      const ok = await signInWithGoogle();
      if (!ok) setError("গুগল থেকে অ্যাপে ফিরে আসা যায়নি। আবার চেষ্টা করুন।");
    } catch (caught) {
      setError(authError(caught instanceof Error ? caught.message : ""));
    }
    setBusy(false);
  }

  async function withEmail() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setNotice("");
    if (mode === "up") {
      const trimmed = name.trim();
      if (!trimmed) {
        setError("নাম লিখুন।");
        setBusy(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: trimmed }, emailRedirectTo: webRedirect },
      });
      if (signUpError) {
        setError(authError(signUpError.message));
        setBusy(false);
        return;
      }
      if (!data.session) {
        setNotice("ইমেইলে একটি লিংক গেছে। সেখান থেকে অ্যাকাউন্ট নিশ্চিত করলে ঢুকতে পারবেন।");
        setBusy(false);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(authError(signInError.message));
        setBusy(false);
        return;
      }
    }
    setBusy(false);
  }

  return (
    <Screen canvas={colors.bg}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ backgroundColor: colors.paper, borderRadius: 32, paddingHorizontal: 24, paddingVertical: 32 }}>
          <Text style={{ fontSize: 28, fontWeight: "700" }}>মেসমেট</Text>
          <Text style={{ marginTop: 4, color: colors.muted }}>গুগল অথবা ইমেইল দিয়ে ঢুকুন</Text>
          {!supabaseConfigured() ? (
            <Text style={{ marginTop: 24, backgroundColor: colors.wash, borderRadius: 16, padding: 14, lineHeight: 22, color: colors.inkSoft }}>
              সুপাবেস এখনো যুক্ত হয়নি। .env.example দেখে mobile/.env এ প্রজেক্টের ঠিকানা আর anon কী বসান।
            </Text>
          ) : (
            <>
              <Pressable
                onPress={withGoogle}
                disabled={busy}
                style={{ marginTop: 24, height: 48, borderRadius: 16, borderWidth: 1, borderColor: "#E7E0F4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, opacity: busy ? 0.6 : 1 }}
              >
                <GoogleMark />
                <Text style={{ fontWeight: "700" }}>গুগল দিয়ে ঢুকুন</Text>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: "#EFEAF8" }} />
                <Text style={{ color: colors.muted, fontSize: 12 }}>অথবা</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#EFEAF8" }} />
              </View>
              <View style={{ flexDirection: "row", backgroundColor: colors.field, borderRadius: 999, padding: 4 }}>
                <Pressable onPress={() => { setMode("in"); setError(""); setNotice(""); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 8, backgroundColor: mode === "in" ? colors.paper : "transparent" }}>
                  <Text style={{ textAlign: "center", fontWeight: mode === "in" ? "700" : "400", color: mode === "in" ? colors.ink : colors.muted }}>ঢুকুন</Text>
                </Pressable>
                <Pressable onPress={() => { setMode("up"); setError(""); setNotice(""); }} style={{ flex: 1, borderRadius: 999, paddingVertical: 8, backgroundColor: mode === "up" ? colors.paper : "transparent" }}>
                  <Text style={{ textAlign: "center", fontWeight: mode === "up" ? "700" : "400", color: mode === "up" ? colors.ink : colors.muted }}>নতুন অ্যাকাউন্ট</Text>
                </Pressable>
              </View>
              <View style={{ gap: 12, marginTop: 20 }}>
                {mode === "up" && <Field value={name} onChangeText={setName} placeholder="আপনার নাম" autoCapitalize="words" />}
                <Field value={email} onChangeText={setEmail} placeholder="ইমেইল" keyboardType="email-address" />
                <Field value={password} onChangeText={setPassword} placeholder="পাসওয়ার্ড" secure />
                <ErrorText>{error}</ErrorText>
                {notice ? <Text style={{ color: colors.good, lineHeight: 22 }}>{notice}</Text> : null}
                <Button label={busy ? "অপেক্ষা করুন" : mode === "up" ? "অ্যাকাউন্ট খুলুন" : "ঢুকুন"} onPress={withEmail} busy={busy} />
              </View>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <Path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <Path fill="#FBBC05" d="M3.9 10.7A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.2.3-1.7V5H.9A9 9 0 0 0 0 9c0 1.4.3 2.8.9 4l3-2.3z" />
      <Path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </Svg>
  );
}
