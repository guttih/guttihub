// src/utils/serverOnly/getUserRole.ts

import { UserRole } from "@/utils/auth/accessControl";
import authorizedUsersJson from "@/config/authorizedUsers.json";

const authorizedUsers: Record<string, string> = authorizedUsersJson;

/**
 * Looks up the user's role based on their email.
 * 
 * ✅ Use in server code only.
 */
export function getUserRole(email?: string | null): UserRole | null {
  if (!email) return null;
  return authorizedUsers[email] as UserRole || null;
}
