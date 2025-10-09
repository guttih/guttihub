// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/utils/auth/accessControl";
import bcrypt from "bcrypt";
import type { UserFormData } from "@/types/user";

function jsonError(status: number, code: string, message: string, details?: unknown) {
    return NextResponse.json({ error: { code, message, details } }, { status });
}

export async function GET() {
    const session = await auth();
    const user = session?.user;
    if (!user || !hasAdminAccess(user)) {
        return jsonError(401, "UNAUTHORIZED", "Unauthorized");
    }
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true, theme: true, profileImage: true },
    });
    return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const user = session?.user;
    if (!user || !hasAdminAccess(user)) {
        return jsonError(401, "UNAUTHORIZED", "Unauthorized");
    }
    try {
        const body: UserFormData = await req.json();
        const { username, email, password, role, theme, profileImage } = body;
        if (!username || !password) return jsonError(400, "VALIDATION_ERROR", "Missing username or password");
        if (email) {
            const existingEmail = await prisma.user.findUnique({ where: { email } });
            if (existingEmail) return jsonError(409, "EMAIL_TAKEN", "User with this email already exists");
        }
        const existingUsername = await prisma.user.findUnique({ where: { username } });
        if (existingUsername) return jsonError(409, "USERNAME_TAKEN", "Username already exists");

        const passwordHash = await bcrypt.hash(password!, 10);
        const newUser = await prisma.user.create({
            data: { username, email: email || null, passwordHash, role: role || "VIEWER", theme: theme || "light", profileImage: profileImage || "" },
            select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true, theme: true, profileImage: true },
        });
        return NextResponse.json(newUser, { status: 201 });
    } catch (err) {
        console.error("POST /api/admin/users failed:", err);
        return jsonError(500, "INTERNAL_ERROR", "Something went wrong while creating the user");
    }
}
