// src/app/api/user/self/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Theme } from "@prisma/client";
import bcrypt from "bcrypt";

export async function GET() {
    const session = await auth();
    const id = (session?.user as { id?: string })?.id;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, username: true, email: true, role: true, theme: true, profileImage: true } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
    const session = await auth();
    const id = (session?.user as { id?: string })?.id;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { username, email, password, theme, profileImage } = body as { username?: string; email?: string; password?: string; theme?: string; profileImage?: string };

    const data: import("@prisma/client").Prisma.UserUpdateInput = {};
    if (typeof username === "string" && username.trim()) data.username = username.trim();
    if (typeof email === "string") data.email = email || null;
    if (typeof profileImage === "string") data.profileImage = profileImage;
    if (theme && Object.values(Theme).includes(theme as Theme)) data.theme = theme as Theme;
    if (typeof password === "string" && password.trim()) data.passwordHash = await bcrypt.hash(password, 10);

    if (Object.keys(data).length === 0) return NextResponse.json({ ok: true });

    await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
}
