import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MealChart, SlotDonut, Spark } from "../charts";
import { IconArrow } from "../icons";
import { addMonths, monthLabel, monthName, monthOf, dateLabel } from "../lib/dates";
import { mealText, taka } from "../lib/format";
import { markWeight, mealKey, readMark } from "../lib/model";
import { useMess } from "../lib/store";
import { MonthLoading, MonthPicker } from "../month-picker";
import { colors } from "../theme";
import { Screen, usePullReload } from "../ui";

export function HomeScreen() {
  const { ledger, month, state, mess, me, isManager, today, months, activeMembers, memberById, monthReady } = useMess();
  const { refreshing, onRefresh } = usePullReload();
  const [range, setRange] = useState<"7" | "15" | "all">("all");
  const current = monthOf(today);
  const elapsed = month === current ? Number(today.slice(8, 10)) : ledger.days;
  const days = ledger.daily.slice(0, elapsed);
  const shown = range === "all" ? days : days.slice(range === "7" ? -7 : -15);
  const open = days.filter((day) => !day.closed);
  const peak = Math.max(...open.map((day) => day.meals), 0);
  const low = open.length ? Math.min(...open.map((day) => day.meals)) : 0;
  const avg = open.length ? ledger.totalMeals / open.length : 0;
  const marker = ((avg - low) / Math.max(peak - low, 1)) * 100;
  const mine = ledger.rows.find((row) => row.member.id === me.id);
  const top = [...ledger.rows].sort((a, b) => b.meals - a.meals)[0];
  const previous = addMonths(current, -1);
  const monthBazaar = state.bazaar.filter((row) => row.date.startsWith(month));
  const hasData = ledger.totalMeals > 0 || ledger.totalBazaar > 0 || ledger.totalBills > 0;
  const markedToday = Boolean(state.meals[mealKey(me.id, today)]) || state.kitchenClosed.includes(today);
  const series = useMemo(
    () =>
      Object.fromEntries(
        ledger.rows.map((row) => [row.member.id, days.map((day) => (day.closed ? 0 : markWeight(readMark(state, row.member.id, day.date))))]),
      ) as Record<string, number[]>,
    [days, ledger.rows, state],
  );

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {mess.name}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.ink }}>{monthLabel(month)}</Text>
        </View>
        <MonthPicker />
      </View>

      {!monthReady(month) ? (
        <MonthLoading />
      ) : (
        <>
          {month === current && !markedToday && (
            <Pressable onPress={() => router.push("/meals")} style={banner(colors.purple)}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>আজকের মিল দিন</Text>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>রাত ১২টার পর আজকের ঘর বন্ধ হয়ে যাবে।</Text>
              </View>
              <Round tint="#fff">
                <IconArrow color={colors.purple} />
              </Round>
            </Pressable>
          )}
          {months.includes(previous) && month === current && (
            <Pressable onPress={() => router.push("/report")} style={banner("#F6F3FF")}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{monthName(previous)} মাসের রিপোর্ট তৈরি হয়েছে</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  {state.approvals.includes(previous) ? "ম্যানেজার অ্যাপ্রুভ করেছেন। এখন হিসাব মিটিয়ে নিন।" : "ম্যানেজার এখনো অ্যাপ্রুভ করেননি।"}
                </Text>
              </View>
              <Round tint={colors.purple}>
                <IconArrow color="#fff" />
              </Round>
            </Pressable>
          )}
          {isManager && activeMembers.length < 2 && (
            <Pressable onPress={() => router.push("/mess")} style={banner(colors.mint)}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>সদস্যদের যুক্ত করুন</Text>
                <Text style={{ color: colors.mintInk, fontSize: 12, marginTop: 2 }}>ইনভাইট কোড বা লিংক পাঠালেই তারা যোগ দিতে পারবে।</Text>
              </View>
              <Round tint="#fff">
                <IconArrow color={colors.good} />
              </Round>
            </Pressable>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, marginTop: 4 }}>
            <Text style={{ fontWeight: "700", color: colors.inkSoft, fontSize: 14 }}>সদস্যরা</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>সবাই সব অঙ্ক দেখতে পারে</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {ledger.rows.map((row) => (
              <Pressable
                key={row.member.id}
                onPress={() => router.push(`/members/${row.member.id}`)}
                style={{ width: 210, borderRadius: 22, padding: 14, backgroundColor: row.member.tint }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700" }} numberOfLines={1}>
                      {row.member.short}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.inkSoft }}>
                      {row.member.leftOn ? "মেস ছেড়েছেন" : row.member.role === "manager" ? "ম্যানেজার" : "সদস্য"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 11, fontWeight: "700" }}>{mealText(row.meals)} মিল</Text>
                    {row.net !== 0 && (
                      <Text style={{ fontSize: 11, fontWeight: "700", color: row.net > 0 ? colors.good : colors.bad }}>{row.net > 0 ? "পাবে" : "দিবে"}</Text>
                    )}
                  </View>
                </View>
                <View style={{ marginTop: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.inkSoft }}>ব্যালেন্স</Text>
                    <Text style={{ fontSize: 20, fontWeight: "700" }}>{taka(Math.abs(row.net))}</Text>
                  </View>
                  <Spark values={series[row.member.id] ?? []} color={row.net >= 0 ? colors.good : colors.bad} />
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {!hasData ? (
            <View style={{ marginTop: 16, borderRadius: 28, borderWidth: 1, borderStyle: "dashed", borderColor: "#DCD2F5", padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>{monthName(month)} মাসের হিসাব এখনো ফাঁকা</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>মিল আর বাজার লেখা শুরু করলেই এখানে চার্ট আর হিসাব দেখা যাবে।</Text>
              <View style={{ gap: 12, marginTop: 16 }}>
                <Step href="/meals" n="১" title="মিল দিন" text="প্রতিদিন নিজের মিল নিজে দিন।" />
                <Step href="/bazaar" n="২" title="বাজার লিখুন" text="যে বাজার করবে সে লিখে রাখবে।" />
                <Step href="/bills" n="৩" title="ঘরের খরচ" text="ভাড়া, বিদ্যুৎ, গ্যাস, বুয়া।" />
              </View>
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 16 }}>
              <View style={panel}>
                <Text style={{ color: colors.muted }}>আমার ব্যালেন্স</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <View style={{ backgroundColor: colors.purple, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 }}>
                    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>{taka(Math.abs(mine?.net ?? 0))}</Text>
                  </View>
                  {mine && mine.net !== 0 && (
                    <View style={{ borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: mine.net > 0 ? colors.goodBg : colors.badBg }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: mine.net > 0 ? colors.good : colors.bad }}>{mine.net > 0 ? "পাবে" : "দিবে"}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.muted, marginTop: 16 }}>আমার বাজার</Text>
                <View style={{ marginTop: 8, backgroundColor: colors.dark, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{taka(mine?.bazaar ?? 0)}</Text>
                  <Pressable onPress={() => router.push("/bazaar")} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" }}>
                    <IconArrow color="#fff" />
                  </Pressable>
                </View>
              </View>

              {top && top.meals > 0 && (
                <View style={panel}>
                  <Text style={{ fontWeight: "700" }}>সবচেয়ে বেশি মিল</Text>
                  <View style={{ marginTop: 12, backgroundColor: "#FAF8FF", borderRadius: 16, padding: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ fontWeight: "700", flex: 1 }} numberOfLines={1}>
                        {top.member.name}
                      </Text>
                      <Text style={{ color: colors.purple, fontWeight: "700" }}>{mealText(top.meals)} মিল</Text>
                    </View>
                    <View style={{ flexDirection: "row", marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>বাজার</Text>
                        <Text style={{ fontWeight: "700" }}>{taka(top.bazaar)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>খাবার</Text>
                        <Text style={{ fontWeight: "700" }}>{taka(top.food)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <View style={panel}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Text style={{ fontWeight: "700" }}>মিলের ধারা</Text>
                  <View style={{ flexDirection: "row", backgroundColor: colors.field, borderRadius: 999, padding: 4 }}>
                    {(
                      [
                        ["7", "৭ দিন"],
                        ["15", "১৫ দিন"],
                        ["all", "পুরো মাস"],
                      ] as const
                    ).map(([key, label]) => (
                      <Pressable key={key} onPress={() => setRange(key)} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: range === key ? colors.purple : "transparent" }}>
                        <Text style={{ fontSize: 12, fontWeight: range === key ? "700" : "400", color: range === key ? "#fff" : colors.muted }}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <MealChart data={shown} />
                <Text style={{ textAlign: "center", color: colors.muted, fontSize: 11 }}>তারিখ · {monthName(month)} · দিনের মোট মিল</Text>
              </View>

              <View style={panel}>
                <Text style={{ fontWeight: "700" }}>এই মাসের চিত্র</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
                  <Stat label="প্রতি মিল" value={ledger.rate == null ? "—" : taka(ledger.rate)} />
                  <Stat label="মোট মিল" value={mealText(ledger.totalMeals)} />
                  <Stat label="মোট বাজার" value={taka(ledger.totalBazaar)} />
                  <Stat label="ঘরের বিল" value={taka(ledger.totalBills)} />
                </View>
                <View style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 11, color: colors.muted }}>কম {mealText(low)}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>বেশি {mealText(peak)}</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: colors.soft, marginTop: 4 }}>
                    <View style={{ position: "absolute", top: -4, left: `${Math.min(98, Math.max(2, marker))}%`, width: 4, height: 16, borderRadius: 2, backgroundColor: colors.purple }} />
                  </View>
                  <Text style={{ marginTop: 8, fontSize: 11, color: colors.muted }}>
                    গড় দিনে {mealText(Number(avg.toFixed(1)))} মিল · রান্না বন্ধ {ledger.closedDays} দিন
                  </Text>
                </View>
                <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <SlotDonut b={ledger.slots.b} l={ledger.slots.l} d={ledger.slots.d} />
                </View>
              </View>

              <View style={panel}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "700" }}>কে কত দিবে বা পাবে</Text>
                  <Pressable onPress={() => router.push("/report")}>
                    <Text style={{ color: colors.purple, fontWeight: "700" }}>পুরো রিপোর্ট</Text>
                  </Pressable>
                </View>
                {ledger.rows.map((row) => {
                  const max = Math.max(...ledger.rows.map((item) => item.bazaar), 1);
                  return (
                    <Pressable key={row.member.id} onPress={() => router.push(`/members/${row.member.id}`)} style={{ paddingVertical: 8 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ fontWeight: "700", flex: 1 }} numberOfLines={1}>
                          {row.member.name}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 13 }}>বাজার {taka(row.bazaar)}</Text>
                      </View>
                      <View style={{ height: 6, borderRadius: 999, backgroundColor: "#F4F0FF", marginTop: 8 }}>
                        <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.purple, width: `${(row.bazaar / max) * 100}%` }} />
                      </View>
                      <Text style={{ marginTop: 6, textAlign: "right", fontWeight: "700", color: row.net > 0 ? colors.good : row.net < 0 ? colors.bad : colors.muted }}>
                        {row.net === 0 ? "সমান" : `${row.net > 0 ? "পাবে" : "দিবে"} ${taka(Math.abs(row.net))}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={panel}>
                <Text style={{ fontWeight: "700" }}>সাম্প্রতিক বাজার</Text>
                <View style={{ marginTop: 12, gap: 12 }}>
                  {monthBazaar.slice(0, 5).map((row) => (
                    <View key={row.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700" }} numberOfLines={1}>
                          {row.note.split("\n")[0] || "বাজার"}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {memberById(row.memberId)?.short ?? "সদস্য"} · {dateLabel(row.date)}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: "700" }}>{taka(row.amount)}</Text>
                    </View>
                  ))}
                  {!monthBazaar.length && <Text style={{ color: colors.muted }}>এই মাসে এখনো বাজার লেখা হয়নি।</Text>}
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function banner(backgroundColor: string) {
  return {
    backgroundColor,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  };
}

function Round({ tint, children }: { tint: string; children: ReactNode }) {
  return <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

function Step({ href, n, title, text }: { href: "/meals" | "/bazaar" | "/bills"; n: string; title: string; text: string }) {
  return (
    <Pressable onPress={() => router.push(href)} style={{ backgroundColor: colors.wash, borderRadius: 16, padding: 16 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>{n}</Text>
      </View>
      <Text style={{ fontWeight: "700", marginTop: 12 }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{text}</Text>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: "50%", marginBottom: 12 }}>
      <Text style={{ fontSize: 11, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const panel = {
  borderRadius: 24,
  borderWidth: 1,
  borderColor: colors.line,
  padding: 16,
};
