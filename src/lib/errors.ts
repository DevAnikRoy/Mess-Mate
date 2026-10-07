type DbError = { code?: string; message?: string } | null | undefined;

export function explain(error: DbError) {
  const text = error?.message ?? "";
  if (text.includes("already_in_mess")) return "আপনি আগেই একটি মেসে আছেন।";
  if (text.includes("invalid_code")) return "এই কোডে কোনো মেস পাওয়া যায়নি। কোডটা আবার দেখুন।";
  if (text.includes("not_manager")) return "এই কাজটা শুধু ম্যানেজার করতে পারেন।";
  if (text.includes("manager_cannot_leave")) return "আগে অন্য কাউকে ম্যানেজার বানান, তারপর মেস ছাড়ুন।";
  if (text.includes("cannot_remove_self")) return "নিজেকে বাদ দেওয়া যায় না।";
  if (text.includes("month_not_finished")) return "মাস শেষ হলে তবেই রিপোর্ট অ্যাপ্রুভ করা যাবে।";
  if (text.includes("not_allowed") || text.includes("not_member")) return "এই কাজের অনুমতি নেই।";
  if (error?.code === "42501" || /row-level security|permission denied/i.test(text)) {
    return "এই কাজের অনুমতি নেই, অথবা দিনটা পেরিয়ে গেছে। দরকার হলে ম্যানেজারকে বলুন।";
  }
  if (error?.code === "23514" || /check constraint/i.test(text)) return "লেখা বা টাকার ঘর ঠিকমতো পূরণ হয়নি।";
  if (error?.code === "23505") return "এটা আগেই সেভ করা আছে।";
  if (/fetch|network|timeout/i.test(text)) return "ইন্টারনেট সংযোগ দেখুন, তারপর আবার চেষ্টা করুন।";
  return "সেভ করা যায়নি। একটু পরে আবার চেষ্টা করুন।";
}
