import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

export async function getSessionProfile(): Promise<SessionProfile | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user ? profileFromUser(data.user) : null;
  } catch {
    return null;
  }
}
