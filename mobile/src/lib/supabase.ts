import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function supabaseConfigured() {
  return Boolean(url && key);
}

export function createClient() {
  if (!url || !key) return null;
  if (!client) {
    client = createSupabaseClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      },
    });
  }
  return client;
}

AppState.addEventListener("change", (state) => {
  if (!client) return;
  if (state === "active") client.auth.startAutoRefresh();
  else client.auth.stopAutoRefresh();
});
