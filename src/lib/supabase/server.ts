import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { dhakaToday } from "@/lib/dates";
import { type Member, type MessContext, shortName, tone } from "@/lib/model";
import { profileFromUser, type SessionProfile } from "@/lib/profile";
import { supabaseEnv } from "./env";

export async function createClient() {
  const env = supabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes the session.
        }
      },
    },
  });
}

type RosterRow = {
  user_id: string;
  role: "manager" | "member";
  joined_on: string;
  left_on: string | null;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type MessRow = {
  id: string;
  name: string;
  invite_code: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  created_at: string;
};

export async function getAppContext(): Promise<{ profile: SessionProfile | null; mess: MessContext | null }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { profile: null, mess: null };
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { profile: null, mess: null };
    const user = data.user;
    const base = profileFromUser(user);

    const [{ data: own }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("memberships").select("mess_id").eq("user_id", user.id).is("left_on", null).maybeSingle(),
    ]);
    const profile: SessionProfile = {
      ...base,
      name: own?.full_name?.trim() || base.name,
      avatarUrl: own?.avatar_url || base.avatarUrl,
    };
    if (!membership) return { profile, mess: null };

    const [{ data: messRow }, { data: roster }] = await Promise.all([
      supabase.from("messes").select("id, name, invite_code, breakfast, lunch, dinner, created_at").eq("id", membership.mess_id).single(),
      supabase
        .from("memberships")
        .select("user_id, role, joined_on, left_on, created_at, profiles(full_name, avatar_url)")
        .eq("mess_id", membership.mess_id)
        .order("created_at"),
    ]);
    if (!messRow || !roster) return { profile, mess: null };
    const row = messRow as MessRow;

    const ordered = (roster as unknown as RosterRow[]).sort((a, b) => {
      const rank = (item: RosterRow) => (item.left_on ? 2 : item.role === "manager" ? 0 : 1);
      return rank(a) - rank(b) || a.created_at.localeCompare(b.created_at);
    });
    const members: Member[] = ordered.map((item, index) => {
      const name = item.profiles?.full_name?.trim() || "সদস্য";
      return {
        id: item.user_id,
        name,
        short: shortName(name),
        avatarUrl: item.profiles?.avatar_url ?? null,
        role: item.role,
        joinedOn: item.joined_on,
        leftOn: item.left_on,
        ...tone(index),
      };
    });

    return {
      profile,
      mess: {
        userId: user.id,
        members,
        mess: {
          id: row.id,
          name: row.name,
          inviteCode: row.invite_code,
          slots: { b: row.breakfast, l: row.lunch, d: row.dinner },
          createdOn: dhakaToday(new Date(row.created_at)),
        },
      },
    };
  } catch {
    return { profile: null, mess: null };
  }
}
