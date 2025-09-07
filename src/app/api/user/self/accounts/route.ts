// src/app/api/user/self/accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    const id = (session?.user as any)?.id as string | undefined;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const accounts = await prisma.account.findMany({ where: { userId: id }, select: { id: true, provider: true, providerAccountId: true, label: true, image: true } });
    return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    const id = (session?.user as any)?.id as string | undefined;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { accountId } = (await req.json().catch(() => ({}))) as { accountId?: string };
    if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });
    await prisma.account.delete({ where: { id: accountId } });
    return NextResponse.json({ ok: true });
}

