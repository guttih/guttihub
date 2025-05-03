// src/utils/serverOnly/hasUserAccessLevel.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/authOptions";
import { hasRole, UserRole } from "@/utils/auth/accessControl";
import authorizedUsersJson from "@/config/authorizedUsers.json";

const authorizedUsers: Record<string, string> = authorizedUsersJson;

/**
 * Get user role from email using static config lookup.
 * ❗ This function is synchronous and does NOT access session data.
 * ✅ Safe to use in frontend or backend.
 *
 * @param email - The user's email address.
 * @returns UserRole or null if not found.
 */
export function getUserRoleServerOnly(email?: string | null): UserRole | null {
    if (!email) return null;
    return authorizedUsers[email] as UserRole ?? null;
  }

/**
 * Get user role based on the current session, and check if it meets required access level.
 * @param requiredRole - Minimum role required (e.g. "moderator", "admin")
 */
export async function hasUserAccessLevel(requiredRole: UserRole) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const userRole = getUserRoleServerOnly(email); // ✅ sync, no await
  
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


  /**
 * Retrieves the current authenticated session and resolves the user's role based on email.
 * Returns `null` role if user is not listed in `authorizedUsers.json`.
 *
 * This is a backend-only function.
 */
export async function getUserSessionWithRoleServerOnly(): Promise<{
    session: Awaited<ReturnType<typeof getServerSession>>;
    email: string | null;
    role: UserRole | null;
  }> {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const role = email ? (authorizedUsers[email] as UserRole) ?? null : null;
  
    return {
      session,
      email,
      role,
    };
  }

/**
 * Returns true if the currently authenticated user has the required role.
 * Backend-only.
 */
export async function hasUserAccessLevelServerOnly(
    requiredRole: UserRole
  ): Promise<boolean> {
    const { role } = await getUserSessionWithRoleServerOnly();
  
    return !!role && hasRole(role, requiredRole);
  }