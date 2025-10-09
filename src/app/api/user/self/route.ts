// src/app/api/user/self/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Theme } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

export async function GET() {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, role: true, theme: true, profileImage: true } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
    const session = await auth();
    const id = session?.user?.id;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Partial<{
        username: unknown;
        email: unknown;
        password: unknown;
        theme: unknown;
        profileImage: unknown;
    }>;

    const username = typeof body.username === "string" ? body.username.trim() : undefined;
    const email = typeof body.email === "string" ? body.email : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    const theme = typeof body.theme === "string" ? body.theme : undefined;
    const profileImage = typeof body.profileImage === "string" ? body.profileImage : undefined;

    const data: Prisma.UserUpdateInput = {};
    if (username) data.username = username;
    if (typeof email !== "undefined") data.email = email || null;
    if (typeof profileImage !== "undefined") data.profileImage = profileImage;
    if (theme && Object.values(Theme).includes(theme as Theme)) data.theme = theme as Theme;
    if (password && password.trim()) data.passwordHash = await bcrypt.hash(password, 10);

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

    await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}
