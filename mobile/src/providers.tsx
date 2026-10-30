import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Redirect, usePathname } from "expo-router";
import { loadAppContext } from "./lib/context";
import type { MessContext } from "./lib/model";
import type { SessionProfile } from "./lib/profile";
import { SessionProvider } from "./lib/session";
import { MessProvider } from "./lib/store";
import { createClient } from "./lib/supabase";
import { colors } from "./theme";

const ReloadCtx = createContext<() => Promise<void>>(async () => {});
export function useReload() {
  return useContext(ReloadCtx);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState(false);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [mess, setMess] = useState<MessContext | null>(null);

  const reload = useCallback(async () => {
    const next = await loadAppContext();
    setProfile(next.profile);
    setMess(next.mess);
    setBoot(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void reload();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void reload();
    });
    return () => data.subscription.unsubscribe();
  }, [reload]);

  if (!boot) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.ink }}>মেসমেট</Text>
        <ActivityIndicator color={colors.purple} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <ReloadCtx.Provider value={reload}>
      <SessionProvider profile={profile}>
        <MessProvider key={mess?.mess.id ?? "none"} context={mess}>
          <Gate profile={profile} hasMess={Boolean(mess)}>
            {children}
          </Gate>
        </MessProvider>
      </SessionProvider>
    </ReloadCtx.Provider>
  );
}

function Gate({
  profile,
  hasMess,
  children,
}: {
  profile: SessionProfile | null;
  hasMess: boolean;
  children: ReactNode;
}) {
  const path = usePathname();
  const publicPath = path === "/login" || path.startsWith("/auth");
  const setup = path === "/onboarding" || path.startsWith("/join");

  if (!profile && !publicPath) return <Redirect href="/login" />;
  if (profile && publicPath) return <Redirect href={hasMess ? "/" : "/onboarding"} />;
  if (profile && !hasMess && !setup && path !== "/account") return <Redirect href="/onboarding" />;
  if (profile && hasMess && setup) return <Redirect href="/" />;
  return <>{children}</>;
}
