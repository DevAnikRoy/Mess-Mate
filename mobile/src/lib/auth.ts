import { AppState, Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createClient } from "./supabase";

const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://mess-mate-beryl.vercel.app").replace(/\/$/, "");
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "1003015908134-n28103ekh6354htmqnken8illf92m1lt.apps.googleusercontent.com";

export const appRedirect = "messmate://auth/callback";
export const webRedirect = `${SITE}/auth/callback`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function paramsFrom(url: string) {
  const query = url.split("?")[1]?.split("#")[0] ?? "";
  const hash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
  const out: Record<string, string> = {};
  for (const part of `${query}&${hash}`.split("&")) {
    if (!part) continue;
    const [rawKey, rawValue] = part.split("=");
    if (!rawKey || rawValue == null) continue;
    out[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, " "));
  }
  return out;
}

function isAuthReturn(url: string) {
  return (
    url.startsWith("messmate://") ||
    url.includes("/auth/callback") ||
    url.includes("/auth/mobile") ||
    url.includes("access_token=")
  );
}

export async function sessionFromUrl(url: string) {
  const params = paramsFrom(url);
  if (params.code) return takeCode(params.code);
  if (params.access_token && params.refresh_token) {
    const supabase = createClient();
    if (!supabase) return false;
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
    return true;
  }
  return false;
}

async function takeCode(code: string) {
  const supabase = createClient();
  if (!supabase) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return true;
}

async function hasSession() {
  const supabase = createClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

async function takeHandoff(id: string) {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("take_auth_handoff", { p_id: id });
  if (error || typeof data !== "string" || !data) {
    try {
      const response = await fetch(`${SITE}/auth/handoff?h=${encodeURIComponent(id)}`);
      const json = (await response.json()) as { code?: string | null };
      return json.code || null;
    } catch {
      return null;
    }
  }
  return data;
}

async function claimHandoff(id: string) {
  const code = await takeHandoff(id);
  if (!code) return false;
  try {
    return await takeCode(code);
  } catch {
    return hasSession();
  }
}

async function signInWithNativeGoogle(): Promise<"ok" | "cancel" | "skip"> {
  try {
    const Google = await import("@react-native-google-signin/google-signin");
    const { GoogleSignin } = Google;
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== "success") return response.type === "cancelled" ? "cancel" : "skip";
    if (!response.data.idToken) return "skip";
    const supabase = createClient();
    if (!supabase) return "skip";
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.data.idToken,
    });
    if (error) return "skip";
    return "ok";
  } catch {
    return "skip";
  }
}

async function waitForBrowserLogin(handoff: string) {
  return await new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearInterval(tick);
      appSub.remove();
      resolve(ok);
    };
    const tick = setInterval(() => {
      void (async () => {
        if (await hasSession()) return finish(true);
        if (await claimHandoff(handoff)) return finish(true);
      })();
    }, 800);
    const appSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void (async () => {
        for (let i = 0; i < 20; i++) {
          if (await hasSession()) return finish(true);
          if (await claimHandoff(handoff)) return finish(true);
          await sleep(400);
        }
        finish(await hasSession());
      })();
    });
    setTimeout(() => finish(false), 180_000);
  });
}

export async function signInWithGoogle() {
  const native = await signInWithNativeGoogle();
  if (native === "ok") return true;
  if (native === "cancel") return false;

  const supabase = createClient();
  if (!supabase) throw new Error("offline");
  const handoff = Crypto.randomUUID();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${webRedirect}?h=${handoff}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error("oauth");

  if (Platform.OS === "android") await WebBrowser.warmUpAsync();
  try {
    const waiting = waitForBrowserLogin(handoff);
    await WebBrowser.openBrowserAsync(data.url, {
      createTask: false,
      showInRecents: false,
      toolbarColor: "#6C4DFF",
      controlsColor: "#FFFFFF",
      enableDefaultShareMenuItem: false,
    });
    return await waiting;
  } finally {
    try {
      WebBrowser.dismissBrowser();
    } catch {
      /* Android cannot dismiss Custom Tabs from JS */
    }
    if (Platform.OS === "android") await WebBrowser.coolDownAsync();
  }
}

export function listenForAuthLinks() {
  const handle = (url: string | null) => {
    if (!url || !isAuthReturn(url)) return;
    void sessionFromUrl(url)
      .catch(() => {})
      .then(async () => {
        if (await hasSession()) {
          try {
            WebBrowser.dismissBrowser();
          } catch {
            /* ignore */
          }
        }
      });
  };
  const sub = Linking.addEventListener("url", ({ url }) => handle(url));
  const appSub = AppState.addEventListener("change", (state) => {
    if (state === "active") void Linking.getInitialURL().then(handle);
  });
  void Linking.getInitialURL().then(handle);
  return () => {
    sub.remove();
    appSub.remove();
  };
}
