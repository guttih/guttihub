//  src/utils/auth/accessControl.ts

import { UserRole, hasRole, isAdmin, isModerator, isStreamer, isViewer } from "@/types/UserRole";

export { hasRole, isAdmin, isModerator, isStreamer, isViewer };
    export type { UserRole };

/**
 * Shared access control helpers.
 * ✅ Safe to use in both frontend and backend.
 * 
 * Example:
 *    if (hasRole(userRole, "moderator")) { ... }
 *    if (isAdmin(userRole)) { ... }
 * 
 * 
 */
