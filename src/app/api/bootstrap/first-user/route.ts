// src/app/api/bootstrap/first-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Theme } from "@prisma/client";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount > 0) {
        return new NextResponse("Bootstrap disabled: users already exist.", { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const { username, email, password, theme } = body as { username?: string; email?: string; password?: string; theme?: string };
    const validTheme = theme && Object.values(Theme).includes(theme as Theme) ? (theme as Theme) : Theme.light;

    if (!username || !password) return new NextResponse("Missing username or password", { status: 400 });
    if (!email) return new NextResponse("Missing email", { status: 400 });

    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email: email || "" }] } });
    if (existing) return new NextResponse("Username or email already exists", { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: { username, email, theme: validTheme, passwordHash, profileImage: "", role: "ADMIN" },
        select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true, theme: true, profileImage: true },
    });

    return NextResponse.json(newUser, { status: 201 });
}

