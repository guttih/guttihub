// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/utils/auth/accessControl";
import bcrypt from "bcrypt";
import type { UserFormData } from "@/types/user";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
    const session = await auth();
    if (!session?.user || !hasAdminAccess(session.user as any)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    try {
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true, theme: true, profileImage: true } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
        return NextResponse.json(user);
    } catch (err) {
        console.error("GET /api/admin/users/:id error:", err);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
    const session = await auth();
    if (!session?.user || !hasAdminAccess(session.user as any)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = (await req.json()) as UserFormData;
    const { username, email, password, role, theme, profileImage } = body;
    const updates: Prisma.UserUpdateInput = {};
    if (typeof username === "string") updates.username = username;
    if (typeof email !== "undefined") updates.email = email;
    if (typeof role !== "undefined") updates.role = role;
    if (typeof theme !== "undefined") updates.theme = theme;
    if (typeof profileImage !== "undefined") updates.profileImage = profileImage;
    if (typeof password === "string" && password.length > 0) updates.passwordHash = await bcrypt.hash(password, 10);
    try {
        const updatedUser = await prisma.user.update({ where: { id }, data: updates, select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true, theme: true, profileImage: true } });
        return NextResponse.json(updatedUser);
    } catch (err) {
        console.error("PATCH /api/admin/users/:id error:", err);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const session = await auth();
    if (!session?.user || !hasAdminAccess(session.user as any)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    try {
        await prisma.user.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        console.error("DELETE /api/admin/users/:id error:", err);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

