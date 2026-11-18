"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SessionInfo = { userId: string; email: string | null; displayName: string | null; timeZone: string };

const SessionContext = createContext<SessionInfo | null>(null);

export function SessionProvider({ value, children }: { value: SessionInfo; children: ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession(): SessionInfo | null {
  return useContext(SessionContext);
}
