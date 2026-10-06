"use client";

import { createContext, useContext } from "react";
import type { SessionProfile } from "./profile";

const SessionContext = createContext<SessionProfile | null>(null);

export function SessionProvider({
  profile,
  children,
}: {
  profile: SessionProfile | null;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={profile}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
