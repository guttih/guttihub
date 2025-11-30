// src/app/api/admin/users/[id]/accounts/[accountId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminAccess } from "@/utils/auth/accessControl";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string; accountId: string }> }) {
    const session = await auth();
    if (!session?.user || !hasAdminAccess(session.user as { role?: string })) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id, accountId } = await context.params;
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    if (!acc || acc.userId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.account.delete({ where: { id: accountId } });
    return NextResponse.json({ ok: true });
}
