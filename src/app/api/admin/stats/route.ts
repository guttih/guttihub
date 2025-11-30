// src/app/api/admin/stats/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hasAdminAccess } from "@/utils/auth/accessControl";

export async function GET() {
    const session = await auth();
    if (!session || !hasAdminAccess(session.user as { role?: string })) {
        return new Response("Forbidden", { status: 403 });
    }
    const [userCount, adminCount] = await Promise.all([prisma.user.count(), prisma.user.count({ where: { role: "ADMIN" } })]);
    return Response.json({ userCount, adminCount });
}
