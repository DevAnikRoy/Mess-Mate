import { createContext, useContext, type ReactNode } from "react";
import type { SessionProfile } from "./profile";

const SessionContext = createContext<SessionProfile | null>(null);

export function SessionProvider({ profile, children }: { profile: SessionProfile | null; children: ReactNode }) {
  return <SessionContext.Provider value={profile}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
