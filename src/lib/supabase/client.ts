"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let browser: BrowserClient | null = null;

export function createClient() {
  const env = supabaseEnv();
  if (!env) return null;
  if (!browser) browser = createBrowserClient(env.url, env.key);
  return browser;
}
