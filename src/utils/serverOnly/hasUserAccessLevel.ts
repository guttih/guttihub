// src/utils/serverOnly/hasUserAccessLevel.ts

import { auth } from "@/auth";
import { hasRole, Role } from "@/utils/auth/accessControl";
import type { Session } from "next-auth";

/**
 * Get user role from email using static config lookup.
 * ❗ This function is synchronous and does NOT access session data.
 * ✅ Safe to use in frontend or backend.
 *
 * @param email - The user's email address.
 * @returns UserRole or null if not found.
 */
// Deprecated: legacy helper removed; roles now come from DB-backed session

/**
 * Get user role based on the current session, and check if it meets required access level.
 * @param requiredRole - Minimum role required (e.g. "moderator", "admin")
 */
export async function hasUserAccessLevel(requiredRole: Role) {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const userRole = session?.user?.role;

    if (!email || !userRole) {
        return {
            ok: false,
            error: "Unauthorized",
            reason: "Missing or invalid user session",
        };
    }

    if (!hasRole({ role: userRole }, requiredRole)) {
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
    session: Session | null;
    email: string | null;
    role: Role | null;
}> {
    const session = await auth();
    const email = session?.user?.email ?? null;
    const role = session?.user?.role ?? null;
    return { session, email, role };
}

/**
 * Returns true if the currently authenticated user has the required role.
 * Backend-only.
 */
export async function hasUserAccessLevelServerOnly(requiredRole: Role): Promise<boolean> {
    const { role } = await getUserSessionWithRoleServerOnly();
    return !!role && hasRole({ role }, requiredRole);
}
