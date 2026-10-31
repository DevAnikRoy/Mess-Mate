import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconBell } from "./icons";
import { addMonths, dateLabel, monthName, monthOf } from "./lib/dates";
import { mealKey, upcomingDuty } from "./lib/model";
import { greetingName } from "./lib/profile";
import { useSession } from "./lib/session";
import { useMaybeMess } from "./lib/store";
import { createClient } from "./lib/supabase";
import { colors } from "./theme";
import { Avatar } from "./ui";

export function AppHeader() {
  const session = useSession();
  const store = useMaybeMess();
  const insets = useSafeAreaInsets();
  const [openNotes, setOpenNotes] = useState(false);

  const notes = useMemo(() => {
    if (!store?.ready) return [];
    const { state, me, today, months, isManager, activeMembers } = store;
    const items: { text: string; href: string }[] = [];
    if (!state.kitchenClosed.includes(today) && !state.meals[mealKey(me.id, today)]) {
      items.push({ text: "আজকের মিল এখনো দেননি। রাত ১২টার পর এই দিন বন্ধ হয়ে যাবে।", href: "/meals" });
    }
    const previous = addMonths(monthOf(today), -1);
    if (months.includes(previous)) {
      items.push(
        state.approvals.includes(previous)
          ? { text: `${monthName(previous)} মাসের রিপোর্ট ম্যানেজার অ্যাপ্রুভ করেছেন। হিসাব মিটিয়ে নিন।`, href: "/report" }
          : { text: `${monthName(previous)} মাসের রিপোর্ট তৈরি। ম্যানেজার এখনো অ্যাপ্রুভ করেননি।`, href: "/report" },
      );
    }
    const nextDuty = upcomingDuty(state, today);
    if (nextDuty && nextDuty.memberId === me.id) {
      items.push({ text: `${dateLabel(nextDuty.date)} আপনার ${nextDuty.name}।`, href: "/duties" });
    }
    if (isManager && activeMembers.length < 2) {
      items.push({ text: "মেসে এখনো আপনি একা। ইনভাইট কোড দিয়ে সদস্যদের যুক্ত করুন।", href: "/mess" });
    }
    return items;
  }, [store]);

  const hello = greetingName(session?.name ?? store?.me.name ?? "");

  return (
    <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.ink }} numberOfLines={1}>
            হ্যালো {hello},
          </Text>
          {store ? (
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
              {dateLabel(store.today)} · {store.mess.name}
            </Text>
          ) : null}
        </View>
        {store ? (
          <Pressable
            onPress={() => setOpenNotes((value) => !value)}
            accessibilityLabel="নোটিস"
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.field, alignItems: "center", justifyContent: "center" }}
          >
            <IconBell color={colors.ink} size={20} />
            {notes.length > 0 && (
              <View style={{ position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple }} />
            )}
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push("/account")} accessibilityLabel="প্রোফাইল">
          <Avatar name={session?.name ?? store?.me.name ?? "স"} src={session?.avatarUrl ?? store?.me.avatarUrl ?? null} size={44} />
        </Pressable>
      </View>
      {openNotes && (
        <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: colors.wash, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 }}>
          {notes.length ? (
            notes.map((note) => (
              <Pressable
                key={note.text}
                onPress={() => {
                  setOpenNotes(false);
                  router.push(note.href);
                }}
                style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E8E0F4" }}
              >
                <Text style={{ fontSize: 14, color: colors.ink, lineHeight: 20 }}>{note.text}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ paddingVertical: 10, fontSize: 14, color: colors.muted }}>নতুন কোনো নোটিস নেই।</Text>
          )}
        </View>
      )}
    </View>
  );
}

const moreItems = [
  { href: "/bills", label: "ঘরের খরচ" },
  { href: "/duties", label: "ডিউটি" },
  { href: "/mess", label: "মেস ও সদস্য" },
  { href: "/account", label: "প্রোফাইল" },
];

export function MoreMenu({ onClose, bottom }: { onClose: () => void; bottom: number }) {
  async function leave() {
    onClose();
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom,
        backgroundColor: colors.paper,
        borderRadius: 24,
        padding: 8,
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      {moreItems.map((item) => (
        <Pressable
          key={item.href}
          onPress={() => {
            onClose();
            router.push(item.href);
          }}
          style={{ borderRadius: 16, paddingHorizontal: 12, paddingVertical: 14 }}
        >
          <Text style={{ fontSize: 15, color: colors.ink }}>{item.label}</Text>
        </Pressable>
      ))}
      <Pressable onPress={leave} style={{ borderRadius: 16, paddingHorizontal: 12, paddingVertical: 14 }}>
        <Text style={{ fontSize: 15, color: colors.ink }}>বের হন</Text>
      </Pressable>
    </View>
  );
}

export function BootState() {
  const store = useMaybeMess();
  if (!store || (store.ready && !store.failed)) return null;
  if (store.failed) {
    return (
      <View style={{ ...cover, backgroundColor: colors.paper, padding: 24, justifyContent: "center" }}>
        <View style={{ backgroundColor: "#FFF4F0", borderRadius: 28, padding: 24 }}>
          <Text style={{ fontWeight: "700", fontSize: 16, textAlign: "center" }}>হিসাব আনা যায়নি</Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 6 }}>ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</Text>
          <Pressable onPress={store.retry} style={{ marginTop: 16, height: 44, borderRadius: 16, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>আবার চেষ্টা</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={{ ...cover, backgroundColor: colors.paper, padding: 16 }} pointerEvents="none">
      <View style={{ height: 160, borderRadius: 28, backgroundColor: "#F4F0FC" }} />
      <View style={{ height: 112, borderRadius: 28, backgroundColor: colors.wash, marginTop: 16 }} />
      <View style={{ height: 112, borderRadius: 28, backgroundColor: colors.wash, marginTop: 12 }} />
    </View>
  );
}

const cover = { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };
