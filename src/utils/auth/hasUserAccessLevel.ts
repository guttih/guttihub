// src/utils/auth/hasUserAccessLevel.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/authOptions";
import { getUserRole } from "@/config";
import { hasRole } from "@/types/UserRole";

export async function hasUserAccessLevel(requiredRole: Parameters<typeof hasRole>[1]) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userRole = getUserRole(email);

  if (!email || !userRole) {
    return {
      ok: false,
      error: "Unauthorized",
      reason: "Missing or invalid user session",
    };
  }

  if (!hasRole(userRole, requiredRole)) {
    return {
      ok: false,
      error: "Forbidden",
      reason: `Insufficient role (${userRole}) for required level (${requiredRole})`,
    };
  }

  return {
    ok: true,
    email,
    role: userRole,
  };
}
