"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function authError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid credentials")) return "ইমেইল বা পাসওয়ার্ড মিলছে না।";
  if (text.includes("already registered") || text.includes("already been registered")) return "এই ইমেইলে আগেই অ্যাকাউন্ট আছে। ঢুকুন।";
  if (text.includes("password")) return "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।";
  if (text.includes("email not confirmed")) return "আগে ইমেইলের লিংক থেকে অ্যাকাউন্ট নিশ্চিত করুন।";
  if (text.includes("rate limit")) return "একটু পরে আবার চেষ্টা করুন।";
  return "ঢোকা যায়নি। একটু পরে আবার চেষ্টা করুন।";
}

export function LoginForm({ configured, callbackError }: { configured: boolean; callbackError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(callbackError ? "গুগল থেকে ফিরে আসা যায়নি। আবার চেষ্টা করুন।" : "");
  const [notice, setNotice] = useState("");

  async function withGoogle() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(authError(oauthError.message));
      setBusy(false);
    }
  }

  async function withEmail(event: FormEvent) {
    event.preventDefault();
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
        options: {
          data: { full_name: trimmed },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(authError(signInError.message));
        setBusy(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#E9E1FF] px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[32px] bg-white px-6 py-8 shadow-[0_20px_60px_rgba(60,30,120,0.08)]">
        <p className="text-[28px] font-bold tracking-tight">মেসমেট</p>
        <p className="mt-1 text-sm text-[#8E8AA3]">গুগল অথবা ইমেইল দিয়ে ঢুকুন</p>

        {!configured ? (
          <p className="mt-6 rounded-2xl bg-[#F7F4FF] px-4 py-3 text-sm leading-6 text-[#5C5872]">
            সুপাবেস এখনো যুক্ত হয়নি। <span className="font-medium">.env.example</span> দেখে <span className="font-medium">.env.local</span> এ প্রজেক্টের ঠিকানা আর anon কী বসান।
          </p>
        ) : (
          <>
            <button
              className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#E7E0F4] text-sm font-semibold disabled:opacity-60"
              disabled={busy}
              onClick={withGoogle}
              type="button"
            >
              <GoogleMark />
              গুগল দিয়ে ঢুকুন
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-[#8E8AA3]">
              <span className="h-px flex-1 bg-[#EFEAF8]" />
              অথবা
              <span className="h-px flex-1 bg-[#EFEAF8]" />
            </div>

            <div className="grid grid-cols-2 rounded-full bg-[#F6F4FB] p-1 text-sm">
              <button
                className={`rounded-full py-2 ${mode === "in" ? "bg-white font-semibold shadow-sm" : "text-[#8E8AA3]"}`}
                onClick={() => { setMode("in"); setError(""); setNotice(""); }}
                type="button"
              >
                ঢুকুন
              </button>
              <button
                className={`rounded-full py-2 ${mode === "up" ? "bg-white font-semibold shadow-sm" : "text-[#8E8AA3]"}`}
                onClick={() => { setMode("up"); setError(""); setNotice(""); }}
                type="button"
              >
                নতুন অ্যাকাউন্ট
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={withEmail}>
              {mode === "up" && (
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="আপনার নাম"
                  autoComplete="name"
                  className="h-12 w-full rounded-2xl bg-[#F6F4FB] px-4 text-sm outline-none"
                />
              )}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                placeholder="ইমেইল"
                autoComplete="email"
                className="h-12 w-full rounded-2xl bg-[#F6F4FB] px-4 text-sm outline-none"
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="পাসওয়ার্ড"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                className="h-12 w-full rounded-2xl bg-[#F6F4FB] px-4 text-sm outline-none"
              />
              {error && <p className="text-sm text-[#E11D48]">{error}</p>}
              {notice && <p className="text-sm leading-6 text-[#128A4A]">{notice}</p>}
              <button
                className="h-12 w-full rounded-2xl bg-[#6C4DFF] text-sm font-semibold text-white disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                {busy ? "অপেক্ষা করুন" : mode === "up" ? "অ্যাকাউন্ট খুলুন" : "ঢুকুন"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.2.3-1.7V5H.9A9 9 0 0 0 0 9c0 1.4.3 2.8.9 4l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}
