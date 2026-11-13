import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { usePathname } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import {
  feedDisclosure,
  messageDay,
  messageTime,
  parseWhatsAppExport,
  publishWhatsAppImport,
  whatsappError,
  type ImportMessage,
  type WhatsAppMessage,
} from "../../../shared/whatsapp";
import { confirm } from "../confirm";
import { useMess } from "../lib/store";
import { createClient } from "../lib/supabase";
import { useWhatsAppFeed } from "../lib/use-whatsapp-feed";
import { whatsappBridge, type NativeBridgeStatus } from "../lib/whatsapp-bridge";
import { colors } from "../theme";
import { Button, Field, Sheet } from "../ui";

export function WhatsAppScreen() {
  const { mess, me, isManager } = useMess();
  const visible = usePathname() === "/whatsapp";
  const data = useWhatsAppFeed(mess.id, visible);
  const { feed, bridge, messages, error, loading, connected, hasMore, reload, manage, loadMore } =
    data;
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState(false);
  const [native, setNative] = useState<NativeBridgeStatus | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [seen, setSeen] = useState<string | null>(null);
  const list = useRef<FlatList<WhatsAppMessage>>(null);
  const latest = messages[0]?.id;
  const chronological = useMemo(() => [...messages].reverse(), [messages]);
  const unread = seen
    ? Math.max(
        0,
        messages.findIndex((message) => message.id === seen),
      )
    : 0;

  const checkPhone = useCallback(async () => {
    if (!whatsappBridge) return;
    try {
      setNative(await whatsappBridge.getStatus());
    } catch {
      setNotice("ফোনের সংযোগ পড়া যায়নি। অ্যাপটি আবার খুলুন।");
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void checkPhone();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void checkPhone();
        void reload();
      }
    });
    const timer = settings
      ? setInterval(() => {
          void checkPhone();
        }, 2000)
      : undefined;
    return () => {
      subscription.remove();
      if (timer) clearInterval(timer);
    };
  }, [checkPhone, reload, settings, visible]);

  async function act(action: "pause" | "resume" | "clear" | "disconnect") {
    if (
      (action === "clear" || action === "disconnect") &&
      !(await confirm(
        action === "clear" ? "মেসমেটের এই বার্তাগুলো মুছবেন?" : "ফোনের সংযোগ শেষ করবেন?",
      ))
    )
      return;
    setBusy(true);
    try {
      if (await manage(action)) {
        if (action === "disconnect" && native?.messId === mess.id)
          await whatsappBridge?.disconnect();
        if (action === "resume") await whatsappBridge?.syncNow();
        await checkPhone();
      }
    } catch {
      setNotice("কাজটি হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function pair() {
    if (!consent || !whatsappBridge) return;
    if (
      bridge &&
      !(await confirm(
        "নতুন গ্রুপ যুক্ত করলে আগের ফোনের সংযোগ শেষ হবে। নিশ্চিত করার পর আগের বার্তার ইতিহাস মুছে যাবে।",
      ))
    )
      return;
    setBusy(true);
    setNotice("");
    try {
      if (bridge && !(await manage("disconnect"))) return;
      await whatsappBridge.beginPairing(
        `MM-${Crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      );
      await checkPhone();
    } catch {
      setNotice("আগে নোটিফিকেশন অ্যাক্সেস চালু করুন, তারপর আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    const db = createClient();
    if (!db || !native?.candidate || !whatsappBridge || !consent) return;
    if (
      !(await confirm(
        `${native.candidate} গ্রুপের নতুন বার্তা এই মেসের সদস্যদের দেখানো হবে। এই গ্রুপই যুক্ত করবেন?`,
      ))
    )
      return;
    setBusy(true);
    setNotice("");
    let device: string | null = null;
    try {
      const { data: credential, error: failure } = await db.rpc("connect_whatsapp_bridge", {
        p_mess: mess.id,
        p_group_name: native.candidate,
      });
      if (failure) throw failure;
      device = credential.device_id;
      await whatsappBridge.activate(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        credential.token,
        credential.device_id,
        mess.id,
        me.id,
      );
      await checkPhone();
      await reload();
      setNotice("গ্রুপ যুক্ত হয়েছে। পরের নতুন নোটিফিকেশনের বার্তা এখানে আসবে।");
    } catch (caught) {
      if (device) await db.rpc("disconnect_whatsapp_bridge", { p_mess: mess.id, p_device: device });
      setNotice(whatsappError(caught as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>হোয়াটসঅ্যাপ বার্তা</Text>
          <Text style={styles.muted}>{feed?.group_name ?? mess.name}</Text>
        </View>
        {isManager && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="গ্রুপের সেটিংস"
            style={styles.action}
            onPress={() => setSettings(true)}
          >
            <Text style={styles.actionText}>সেটিংস</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.status}>
        <Text style={styles.small}>
          {feed?.last_received_at
            ? `শেষ বার্তা এসেছে ${messageDay(feed.last_received_at)}, ${messageTime(feed.last_received_at)}`
            : "প্রথম বার্তার অপেক্ষায়"}
        </Text>
        {feed && !feed.enabled && <Text style={styles.warning}>নতুন বার্তা আসা বন্ধ আছে।</Text>}
        {bridge && !bridge.manager_valid && (
          <Text style={styles.warning}>ম্যানেজার বদলেছে। নতুন ম্যানেজারকে আবার গ্রুপ যুক্ত করতে হবে।</Text>
        )}
        {!connected && (
          <Text style={styles.small}>
            সরাসরি আপডেটের সংযোগ অপেক্ষায়। নিচে টানলে আবার বার্তা আসবে।
          </Text>
        )}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {notice && !settings && (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      )}
      {loading && <ActivityIndicator color={colors.purple} style={{ margin: 16 }} />}
      <FlatList
        ref={list}
        data={chronological}
        keyExtractor={(message) => message.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        style={{ backgroundColor: "#FAF8FF" }}
        refreshing={loading}
        onRefresh={() => void reload()}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onContentSizeChange={() => {
          if (atBottom) list.current?.scrollToEnd({ animated: false });
        }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const bottom = contentSize.height - layoutMeasurement.height - contentOffset.y < 80;
          setAtBottom(bottom);
          if (bottom || atBottom) setSeen(latest ?? null);
        }}
        scrollEventThrottle={100}
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
              }}
            >
              <Text style={styles.subtitle}>এখনো কোনো বার্তা আসেনি</Text>
              <Text style={[styles.muted, { textAlign: "center", marginTop: 8 }]}>
                {isManager
                  ? "সেটিংস থেকে গ্রুপ যুক্ত করুন, অথবা পুরনো বার্তা যোগ করুন।"
                  : "ম্যানেজার গ্রুপ যুক্ত করলে নতুন বার্তা এখানে দেখা যাবে।"}
              </Text>
            </View>
          ) : undefined
        }
        ListHeaderComponent={
          hasMore ? (
            <Button
              label="আগের বার্তা দেখুন"
              kind="ghost"
              onPress={() => {
                setAtBottom(false);
                void loadMore();
              }}
            />
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <View>
            {(index === 0 ||
              messageDay(chronological[index - 1].sent_at) !== messageDay(item.sent_at)) && (
              <Text style={styles.day}>{messageDay(item.sent_at)}</Text>
            )}
            <View style={styles.bubble}>
              <Text style={styles.sender}>{item.sender}</Text>
              <Text selectable style={styles.body}>
                {item.body}
              </Text>
              <Text style={styles.time}>
                {item.source === "import" ? "যোগ করা বার্তা · " : ""}
                {messageTime(item.sent_at)}
              </Text>
            </View>
          </View>
        )}
      />
      {!atBottom && unread > 0 && (
        <View style={styles.newMessages}>
          <Button
            label={`${unread}টি নতুন বার্তা দেখুন`}
            onPress={() => {
              setAtBottom(true);
              setSeen(latest ?? null);
              list.current?.scrollToEnd({ animated: true });
            }}
          />
        </View>
      )}
      <Text style={styles.footer}>শুধু পড়ার জন্য। সর্বশেষ ৫০০টি বার্তা রাখা হয়।</Text>

      <Sheet visible={settings && isManager} title="গ্রুপের সংযোগ" onClose={() => setSettings(false)}>
        <ScrollView
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        >
          <Text style={styles.muted}>
            ফোন অফলাইন থাকলে বা WhatsApp পড়ার মতো নোটিফিকেশন না দিলে কিছু বার্তা দেরিতে আসতে পারে বা
            বাদ পড়তে পারে।
          </Text>
          {bridge?.last_seen_at && (
            <Text style={styles.small}>
              ফোনের শেষ সংযোগ {messageDay(bridge.last_seen_at)}, {messageTime(bridge.last_seen_at)}
            </Text>
          )}
          {notice && (
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              {notice}
            </Text>
          )}
          {error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {!whatsappBridge ? (
            <Text style={styles.warning}>
              {Platform.OS === "android"
                ? "লাইভ বার্তা চালু করতে নতুন Android APK ইনস্টল করুন। Expo Go-তে ফোনের সংযোগ চালু হয় না।"
                : "লাইভ বার্তার সংযোগ একটি Android ফোন থেকে চালু করতে হবে।"}
            </Text>
          ) : (
            <>
              <Text style={styles.subtitle}>এই ফোন থেকে গ্রুপ যুক্ত করুন</Text>
              <Text style={styles.muted}>{feedDisclosure}</Text>
              <Consent
                value={consent}
                onChange={setConsent}
                label="গ্রুপের সদস্যরা সম্মতি দিয়েছেন। আমি এই ফোন থেকে নির্বাচিত গ্রুপের বার্তা শেয়ার করতে চাই।"
              />
              {!native?.permission && (
                <Button
                  label="নোটিফিকেশন অ্যাক্সেস খুলুন"
                  disabled={!consent || !native?.supported || busy}
                  onPress={() => {
                    void whatsappBridge
                      ?.openSettings()
                      .catch(() =>
                        setNotice("Android সেটিংস থেকে মেসমেটের নোটিফিকেশন অ্যাক্সেস খুলুন।"),
                      );
                  }}
                />
              )}
              {native && !native.supported && (
                <Text style={styles.warning}>গ্রুপ শনাক্ত করতে Android 9 বা পরের সংস্করণ লাগবে।</Text>
              )}
              {native?.active && native.messId === mess.id && (
                <View style={styles.status}>
                  <Text style={styles.small}>
                    {native.listening
                      ? "এই ফোনে গ্রুপের নোটিফিকেশন পড়া চালু আছে।"
                      : "নোটিফিকেশন সেবার সংযোগ অপেক্ষায়।"}
                  </Text>
                  <Text style={styles.small}>{native.queued}টি বার্তা মেসমেটে যোগ হওয়ার অপেক্ষায়।</Text>
                  {native.dropped > 0 && (
                    <Text style={styles.warning}>
                      ফোনে অপেক্ষার সীমা পেরিয়েছে। {native.dropped}টি পুরনো বার্তা বাদ গেছে।
                    </Text>
                  )}
                  {native.error && (
                    <Text style={styles.warning}>
                      {native.error === "paused"
                        ? "ম্যানেজার বার্তা আসা বন্ধ রেখেছেন।"
                        : "বার্তা মেসমেটে আনতে সমস্যা হচ্ছে। ইন্টারনেট দেখে আবার চেষ্টা করুন।"}
                    </Text>
                  )}
                  <Button
                    label="সংযোগ আবার দেখুন"
                    kind="ghost"
                    onPress={() => {
                      void whatsappBridge?.syncNow().catch(() => setNotice("আবার চেষ্টা করুন।"));
                    }}
                  />
                </View>
              )}
              <Button
                label={native?.pending ? "নতুন পরীক্ষার কোড নিন" : "গ্রুপ শনাক্ত করুন"}
                disabled={!consent || !native?.permission || !native.supported || busy}
                onPress={() => void pair()}
              />
              {native?.pending && (
                <View style={styles.pairing}>
                  <Text style={styles.muted}>
                    গ্রুপের অন্য একজনকে নিচের কোডটি ঠিক এভাবেই পাঠাতে বলুন। এই ফোনে WhatsApp বন্ধ রেখে
                    নোটিফিকেশনের অপেক্ষা করুন। কোড ১০ মিনিট চলবে।
                  </Text>
                  <Text selectable style={styles.code}>
                    {native.pairCode}
                  </Text>
                  <Button
                    kind="ghost"
                    label="কোড কপি করুন"
                    onPress={() => {
                      void Clipboard.setStringAsync(native.pairCode).catch(() =>
                        setNotice("কপি হয়নি। আবার চেষ্টা করুন।"),
                      );
                    }}
                  />
                  {native.candidate ? (
                    <>
                      <Text style={styles.subtitle}>পাওয়া গ্রুপ — {native.candidate}</Text>
                      <Button
                        label="এই গ্রুপ যুক্ত করুন"
                        busy={busy}
                        disabled={!consent}
                        onPress={() => void activate()}
                      />
                    </>
                  ) : (
                    <Text style={styles.small}>
                      পরীক্ষার বার্তার অপেক্ষায়। শনাক্ত না হলে এই ফোনের নোটিফিকেশনে দরকারি গ্রুপের পরিচয়
                      নাও থাকতে পারে। তখন পুরনো বার্তা যোগ করার সুবিধা ব্যবহার করুন।
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
          {feed && (
            <View style={{ gap: 8 }}>
              {bridge && (
                <Button
                  kind="ghost"
                  disabled={busy}
                  label={feed.enabled ? "আসা বন্ধ রাখুন" : "আবার চালু করুন"}
                  onPress={() => void act(feed.enabled ? "pause" : "resume")}
                />
              )}
              {bridge && (
                <Button
                  kind="danger"
                  disabled={busy}
                  label="ফোনের সংযোগ শেষ করুন"
                  onPress={() => void act("disconnect")}
                />
              )}
              <Button
                kind="danger"
                disabled={busy || !messages.length}
                label="মেসমেটের বার্তা মুছুন"
                onPress={() => void act("clear")}
              />
            </View>
          )}
          <ImportMessages messId={mess.id} groupName={feed?.group_name ?? ""} onSaved={reload} />
        </ScrollView>
      </Sheet>
    </View>
  );
}

function Consent({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.consent}
    >
      <Text style={{ color: colors.purple, fontSize: 22 }}>{value ? "☑" : "☐"}</Text>
      <Text style={[styles.muted, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

function ImportMessages({
  messId,
  groupName,
  onSaved,
}: {
  messId: string;
  groupName: string;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [name, setName] = useState(groupName);
  const [order, setOrder] = useState<"dmy" | "mdy">("dmy");
  const [preview, setPreview] = useState<ImportMessage[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function parse() {
    try {
      const result = parseWhatsAppExport(raw, order);
      setPreview(result.messages);
      setExcluded(new Set());
      setNotice(
        result.skipped
          ? `${result.skipped}টি সিস্টেম, মিডিয়া বা অসমর্থিত বার্তা বাদ গেছে।`
          : result.messages.length
            ? ""
            : "কোনো বার্তা পাওয়া যায়নি। তারিখের ধরন দেখুন।",
      );
    } catch (caught) {
      setNotice((caught as Error).message);
    }
  }

  async function save() {
    const db = createClient();
    if (!db || !consent || !(groupName || name).trim()) return;
    setBusy(true);
    try {
      const count = await publishWhatsAppImport(
        preview.filter((_, index) => !excluded.has(index)),
        (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text),
        async (events) => {
          const { data, error } = await db.rpc("import_whatsapp_messages", {
            p_mess: messId,
            p_group_name: (groupName || name).trim(),
            p_events: events,
          });
          if (error) throw error;
          return Number(data);
        },
      );
      setRaw("");
      setPreview([]);
      setConsent(false);
      setNotice(`${count}টি নতুন বার্তা যোগ হয়েছে।`);
      await onSaved();
    } catch (caught) {
      setNotice(
        `${whatsappError(caught as { message?: string })} আবার চেষ্টা করলে সেভ হওয়া একই বার্তা দ্বিতীয়বার যোগ হবে না।`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
      <Button
        kind="ghost"
        label={open ? "ইমপোর্ট বন্ধ করুন" : "পুরনো বার্তা যোগ করুন"}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text style={styles.muted}>
            WhatsApp থেকে Export chat → Without media নিন। .txt ফাইলের লেখা কপি করে নিচে দিন। ওয়েব
            অ্যাপে সরাসরি ফাইলও দিতে পারবেন। প্রিভিউতে সময় ঢাকা ধরে দেখানো হবে।
          </Text>
          {!groupName && (
            <Field placeholder="গ্রুপের নাম" value={name} onChangeText={setName} maxLength={120} />
          )}
          <Field
            placeholder="চ্যাটের লেখা পেস্ট করুন"
            value={raw}
            onChangeText={(value) => {
              setRaw(value);
              setPreview([]);
            }}
            multiline
            maxLength={1_000_000}
          />
          <Button
            kind="ghost"
            label={order === "dmy" ? "তারিখ দিন/মাস/বছর · বদলান" : "তারিখ মাস/দিন/বছর · বদলান"}
            disabled={busy}
            onPress={() => {
              setOrder(order === "dmy" ? "mdy" : "dmy");
              setPreview([]);
            }}
          />
          <Button kind="ghost" label="প্রিভিউ দেখুন" disabled={busy || !raw.trim()} onPress={parse} />
          {notice && (
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              {notice}
            </Text>
          )}
          {preview.length > 0 && (
            <>
              <ScrollView style={{ maxHeight: 240 }}>
                {preview.map((message, index) => (
                  <View
                    key={index}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                      paddingVertical: 8,
                    }}
                  >
                    <Consent
                      value={!excluded.has(index)}
                      onChange={() =>
                        setExcluded((before) => {
                          const next = new Set(before);
                          if (next.has(index)) next.delete(index);
                          else next.add(index);
                          return next;
                        })
                      }
                      label={`${message.sender} · ${messageDay(message.sent_at)} ${messageTime(message.sent_at)}\n${message.body}`}
                    />
                  </View>
                ))}
              </ScrollView>
              <Consent
                value={consent}
                onChange={setConsent}
                label="গ্রুপের সম্মতি আছে। নির্বাচিত বার্তাগুলো মেসের বর্তমান ও ভবিষ্যৎ সদস্যদের দেখানো যাবে।"
              />
              <Button
                label={`${preview.length - excluded.size}টি বার্তা যোগ করুন`}
                busy={busy}
                disabled={
                  !consent || !(groupName || name).trim() || preview.length === excluded.size
                }
                onPress={() => void save()}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  header: { padding: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  muted: { fontSize: 14, lineHeight: 23, color: colors.inkSoft },
  small: { fontSize: 12, lineHeight: 20, color: colors.inkSoft },
  status: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.wash, gap: 4 },
  warning: { fontSize: 13, lineHeight: 21, color: colors.warnInk },
  error: {
    margin: 12,
    padding: 12,
    borderRadius: 12,
    color: "#9F1239",
    backgroundColor: colors.badBg,
    lineHeight: 22,
  },
  notice: { padding: 12, color: colors.inkSoft, lineHeight: 22 },
  action: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: colors.soft,
    borderRadius: 14,
  },
  actionText: { color: colors.purple, fontWeight: "700" },
  day: { textAlign: "center", color: colors.inkSoft, fontSize: 12, marginVertical: 14 },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    backgroundColor: colors.paper,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    marginBottom: 12,
  },
  sender: { fontSize: 13, color: "#5738C9", fontWeight: "700" },
  body: { fontSize: 15, color: colors.ink, lineHeight: 26, marginTop: 4 },
  time: { fontSize: 11, color: colors.inkSoft, alignSelf: "flex-end", marginTop: 4 },
  footer: { paddingVertical: 8, textAlign: "center", fontSize: 11, color: colors.inkSoft },
  consent: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    alignItems: "flex-start",
    minHeight: 44,
  },
  pairing: { padding: 16, backgroundColor: colors.wash, borderRadius: 20, gap: 12 },
  code: { fontSize: 20, fontWeight: "700", color: colors.purple, textAlign: "center", padding: 8 },
  newMessages: { position: "absolute", bottom: 38, alignSelf: "center" },
});
