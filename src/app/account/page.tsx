"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";

export default function AccountPage() {
  const session = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-lg rounded-[28px] bg-[#F7F4FF] p-6">
        <h1 className="text-xl font-semibold">প্রোফাইল</h1>
        <p className="mt-2 text-sm leading-6 text-[#5C5872]">
          সুপাবেস যুক্ত হলে এখানে আপনার নাম, ইমেইল আর ছবি দেখাবে।
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg rounded-[28px] bg-white p-6">
      <Avatar name={session.name} src={session.avatarUrl} className="h-24 w-24 rounded-full text-3xl" />
      <h1 className="mt-4 text-2xl font-semibold">{session.name}</h1>
      <p className="mt-1 text-sm text-[#8E8AA3]">{session.email}</p>
      <p className="mt-3 inline-flex rounded-full bg-[#F1EAFF] px-3 py-1 text-xs font-semibold text-[#6C4DFF]">
        {session.provider === "google" ? "গুগল" : "ইমেইল"}
      </p>
      <button
        className="mt-6 h-11 rounded-2xl bg-[#17171C] px-5 text-sm font-semibold text-white disabled:opacity-60"
        disabled={busy}
        onClick={leave}
        type="button"
      >
        বের হন
      </button>
    </section>
  );
}
