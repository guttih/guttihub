// src/app/api/admin/users/[id]/accounts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminAccess } from "@/utils/auth/accessControl";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { id: string };

type JwtClaims = { email?: string; preferred_username?: string; upn?: string; unique_name?: string; name?: string; picture?: string };

function decodeJwtPayload(token?: string | null): JwtClaims {
    if (!token) return {};
    try { const [, payload] = token.split("."); return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return {}; }
}

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
    const { id } = await ctx.params;
    const session = await auth();
    const user = session?.user;
    if (!user || !hasAdminAccess(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rows = await prisma.account.findMany({ where: { userId: id }, select: { id: true, provider: true, providerAccountId: true, id_token: true }, orderBy: { provider: "asc" } });
    const accounts = rows.map((a) => {
        const c = decodeJwtPayload(a.id_token);
        const label = c.email ?? c.preferred_username ?? c.upn ?? c.unique_name ?? c.name ?? a.providerAccountId;
        return { id: a.id, provider: a.provider, providerAccountId: a.providerAccountId, label, picture: c.picture };
    });
    return NextResponse.json({ accounts });
}
