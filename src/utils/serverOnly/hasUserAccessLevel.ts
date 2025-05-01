// src/utils/serverOnly/hasUserAccessLevel.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/authOptions";
import { hasRole, UserRole } from "@/utils/auth/accessControl";
import authorizedUsersJson from "@/config/authorizedUsers.json";

const authorizedUsers: Record<string, string> = authorizedUsersJson;

/**
 * Get role from email (server-only).
 * ✅ Use this on the backend only.
 */
export function getUserRoleServerOnly(email?: string | null): UserRole | null {
  if (!email) return null;
  return authorizedUsers[email] as UserRole || null;
}

/**
 * Checks if the current session has required access level.
 * ✅ Admin passes checks for moderator, etc.
 */
export async function hasUserAccessLevel(requiredRole: UserRole) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const userRole = getUserRoleServerOnly(email);

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
