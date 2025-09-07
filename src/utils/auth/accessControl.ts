// src/utils/auth/accessControl.ts
import { Role } from "@prisma/client";

export type UserRole = Role;

function normalizeRole(input: unknown): Role | null {
    if (!input) return null;
    if (typeof input === "string") {
        const s = input.toLowerCase();
        if (s === "viewer") return Role.VIEWER;
        if (s === "moderator") return Role.MODERATOR;
        if (s === "admin") return Role.ADMIN;
        if (s === "streamer") return Role.MODERATOR; // temporary mapping
        // if already matches Role string name
        if (Object.values(Role).includes(input as Role)) return input as Role;
        return null;
    }
    return null;
}

// Generic role check: accepts either a user object, role string, or Role enum.
export function hasRole(userOrRole: { role?: string } | string | Role, required: Role | string): boolean {
    const roleHierarchy = [Role.VIEWER, Role.MODERATOR, Role.ADMIN];
    const userRole: Role | null = typeof userOrRole === "object" && userOrRole !== null ? normalizeRole(userOrRole.role) : normalizeRole(userOrRole);
    const requiredRole: Role | null = normalizeRole(required);
    if (!userRole || !requiredRole) return false;
    return roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole);
}

export function hasAdminAccess(user: { role?: string } | string | Role): boolean {
    return hasRole(user, Role.ADMIN);
}

export function hasModeratorAccess(user: { role?: string } | string | Role): boolean {
    return hasRole(user, Role.MODERATOR);
}

export function hasViewerAccess(user: { role?: string } | string | Role): boolean {
    return hasRole(user, Role.VIEWER);
}

export { Role } from "@prisma/client";
