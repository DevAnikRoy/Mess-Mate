export type WhatsAppFeed = {
  mess_id: string;
  group_name: string;
  enabled: boolean;
  capture_after: string;
  last_received_at: string | null;
  updated_at: string;
};

export type WhatsAppMessage = {
  id: string;
  sender: string;
  body: string;
  sent_at: string;
  source: "bridge" | "import";
};

export type ImportMessage = Pick<WhatsAppMessage, "sender" | "body" | "sent_at">;
export type BridgeStatus = {
  device_id: string;
  last_seen_at: string | null;
  manager_valid: boolean;
};

export const WHATSAPP_COLS = "id, sender, body, sent_at, source";
export const feedDisclosure =
  "Android-এর নোটিফিকেশন অ্যাক্সেস চালু করলে মেসমেট অন্য অ্যাপের নোটিফিকেশনও পড়ার সুযোগ পায়। শুধু আপনার বেছে নেওয়া WhatsApp গ্রুপের নতুন বার্তার লেখা ও প্রেরকের নাম সার্ভারে পাঠানো হবে। এই মেসের বর্তমান ও ভবিষ্যৎ সদস্যরা সেগুলো পড়তে পারবেন। আগে গ্রুপের সদস্যদের সম্মতি নিন।";

export function whatsappError(error: { code?: string; message?: string } | null | undefined) {
  const text = error?.message ?? "";
  if (/PGRST20[25]|42P01|42883/.test(error?.code ?? ""))
    return "বার্তার সুবিধা চালু করতে ডেটাবেসের নতুন মাইগ্রেশন লাগবে।";
  if (/not_manager|not_member|42501/.test(`${text} ${error?.code}`))
    return "এই কাজের অনুমতি বদলে গেছে। পেজটি আবার খুলুন।";
  if (/bridge_revoked/.test(text)) return "এই ফোনের সংযোগ শেষ হয়েছে। আবার গ্রুপ যুক্ত করুন।";
  if (/feed_paused/.test(text)) return "বার্তা আসা আপাতত বন্ধ আছে। ম্যানেজার আবার চালু করতে পারবেন।";
  if (/invalid_messages/.test(text))
    return "কিছু বার্তার তারিখ বা লেখা ঠিক নেই। প্রিভিউ দেখে আবার চেষ্টা করুন।";
  return "বার্তা আনা বা সেভ করা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।";
}

export function messageDay(timestamp: string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function messageTime(timestamp: string) {
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function importIdentity(message: ImportMessage, occurrence: number) {
  return `${message.sent_at}\0${message.sender}\0${message.body}\0${occurrence}`;
}

export async function publishWhatsAppImport(
  messages: ImportMessage[],
  hash: (text: string) => Promise<string>,
  insert: (events: (ImportMessage & { event_key: string })[]) => Promise<number>,
) {
  const occurrences = new Map<string, number>();
  const events = await Promise.all(
    messages.map(async (message) => {
      const identity = importIdentity(message, 0);
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);
      return { ...message, event_key: await hash(importIdentity(message, occurrence)) };
    }),
  );
  let inserted = 0;
  for (let index = 0; index < events.length; index += 25)
    inserted += await insert(events.slice(index, index + 25));
  return inserted;
}

/** Export timestamps have no timezone. The preview explicitly uses Dhaka time. */
export function parseWhatsAppExport(raw: string, order: "dmy" | "mdy") {
  if (raw.length > 1_000_000) throw new Error("ফাইলটি বড়। সাম্প্রতিক বার্তাগুলো নিয়ে আবার চেষ্টা করুন।");
  const messages: ImportMessage[] = [];
  let skipped = 0;
  let current: ImportMessage | null = null;
  function flush() {
    if (!current) return;
    if (
      current.body.trim() &&
      current.body.length <= 4000 &&
      !current.body.includes("\0") &&
      !/<media omitted>|মিডিয়া বাদ দেওয়া হয়েছে/i.test(current.body)
    )
      messages.push(current);
    else skipped += 1;
    current = null;
  }
  const header =
    /^\[?(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\]?\s*(?:-\s*)?(.*)$/i;
  for (const original of raw.split(/\r?\n/)) {
    const line = original
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
      .replace(/\u202f/g, " ");
    const match = header.exec(
      line.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit))),
    );
    if (!match) {
      if (current) current.body += `\n${original}`;
      continue;
    }
    flush();
    const [, a, b, c, hourText, minuteText, secondText, period, normalizedContent] = match;
    const content = line.slice(line.length - normalizedContent.length);
    const iso = a.length === 4;
    const year = Number(iso ? a : c.length === 2 ? `20${c}` : c);
    const month = Number(iso ? b : order === "dmy" ? b : a);
    const day = Number(iso ? c : order === "dmy" ? a : b);
    let hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText ?? 0);
    if (period && (hour < 1 || hour > 12)) {
      skipped += 1;
      continue;
    }
    if (period) hour = (hour % 12) + (period.toUpperCase() === "PM" ? 12 : 0);
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const split = content.indexOf(": ");
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day ||
      hour > 23 ||
      minute > 59 ||
      second > 59 ||
      split < 1
    ) {
      skipped += 1;
      continue;
    }
    const sender = content.slice(0, split).trim();
    if (sender.length > 160 || sender.includes("\0")) {
      skipped += 1;
      continue;
    }
    current = {
      sender: /^\+?[\d\s()-]{7,}$/.test(sender) ? "WhatsApp সদস্য" : sender,
      body: content.slice(split + 2),
      sent_at: new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    };
  }
  flush();
  return { messages: messages.slice(-500), skipped: skipped + Math.max(0, messages.length - 500) };
}
