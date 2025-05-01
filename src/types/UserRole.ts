
export type UserRole = "viewer" | "streamer" | "moderator" | "admin";

/** Numeric level used for hierarchy comparison */
export const ROLE_LEVEL: Record<UserRole, number> = {
  viewer: 1,
  streamer: 2,
  moderator: 3,
  admin: 4,
};

/**
 * Check if user meets required level (admin counts as moderator, etc.)
 */
export function hasRole(userRole: UserRole | null, required: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required];
}

/**
 * Exact role checks (no hierarchy)
 */
export function isAdmin(role: UserRole | null): boolean {
  return role === "admin";
}
export function isModerator(role: UserRole | null): boolean {
  return role === "moderator";
}
export function isStreamer(role: UserRole | null): boolean {
  return role === "streamer";
}
export function isViewer(role: UserRole | null): boolean {
  return role === "viewer";
}
