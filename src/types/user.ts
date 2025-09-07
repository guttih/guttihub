// src/types/user.ts
import type { Role, Theme } from "@prisma/client";

export interface UserFormData {
    id?: string;
    username: string;
    email?: string;
    password?: string;
    role?: Role;
    theme?: Theme;
    profileImage?: string;
    createdAt?: string;
    updatedAt?: string;
}

