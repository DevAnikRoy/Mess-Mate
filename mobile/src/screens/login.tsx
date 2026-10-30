import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { signInWithGoogle, webRedirect } from "../lib/auth";
import { createClient, supabaseConfigured } from "../lib/supabase";
import { colors } from "../theme";
import { Button, ErrorText, Field, Screen, ripple } from "../ui";

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
    <Screen>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.purple, marginTop: 36 }}>মেসমেট</Text>
      <Text style={{ fontSize: 32, fontWeight: "800", color: colors.ink, marginTop: 8 }}>ঢুকুন</Text>
      <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 28, lineHeight: 22 }}>
        গুগল খুললে সেখানে ঢুকুন। ব্রাউজার বন্ধ করলে অ্যাপেই লগইন থাকবে।
      </Text>
      {!supabaseConfigured() ? (
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          সুপাবেস এখনো যুক্ত হয়নি। .env.example দেখে mobile/.env এ প্রজেক্টের ঠিকানা আর anon কী বসান।
        </Text>
      ) : (
        <>
          <Button label="গুগল দিয়ে ঢুকুন" onPress={withGoogle} busy={busy} />
          <Text style={{ textAlign: "center", color: colors.muted, marginVertical: 18 }}>অথবা ইমেইল</Text>
          <View style={{ flexDirection: "row", backgroundColor: colors.paper, borderRadius: 14, padding: 4, marginBottom: 14, elevation: 1 }}>
            <Pressable
              onPress={() => setMode("in")}
              android_ripple={ripple}
              style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: mode === "in" ? colors.soft : "transparent" }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: mode === "in" ? colors.purple : colors.muted }}>ঢুকুন</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("up")}
              android_ripple={ripple}
              style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: mode === "up" ? colors.soft : "transparent" }}
            >
              <Text style={{ textAlign: "center", fontWeight: "700", color: mode === "up" ? colors.purple : colors.muted }}>নতুন</Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {mode === "up" && <Field value={name} onChangeText={setName} placeholder="আপনার নাম" autoCapitalize="words" />}
            <Field value={email} onChangeText={setEmail} placeholder="ইমেইল" keyboardType="email-address" />
            <Field value={password} onChangeText={setPassword} placeholder="পাসওয়ার্ড" secure />
            <ErrorText>{error}</ErrorText>
            {notice ? <Text style={{ color: colors.good }}>{notice}</Text> : null}
            <Button label={mode === "up" ? "অ্যাকাউন্ট খুলুন" : "ঢুকুন"} kind="dark" onPress={withEmail} busy={busy} />
          </View>
        </>
      )}
    </Screen>
  );
}
