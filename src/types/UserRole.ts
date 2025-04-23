// src/types/UserRole.ts
export type UserRole = "viewer" | "streamer" | "moderator" | "admin";

/** numeric weight lets you do simple `>=` checks */
export const ROLE_LEVEL: Record<UserRole, number> = {
  viewer:    1,  // Can view streams and movies
  streamer:  2,  // Can stream live
  moderator: 3,  // Can record streams
  admin:     4,  // Can manage the app and do everything else
};

/** helper to see if `user` meets `required` */
export function hasRole(
  userRole: UserRole | null,
  required: UserRole
): boolean {
  if (!userRole) return false;
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required];
}
