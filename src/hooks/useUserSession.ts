// src/hooks/useUserSession.ts

import { useSession } from "next-auth/react";

export function useUserSession() {
  const { data: session, status } = useSession();

  const email = session?.user?.email ?? null;
  const name = session?.user?.name ?? null;
  const userRole = session?.user?.role ?? null; // 💡 Must be injected via JWT callback

  return { userRole, name, email, status };
}