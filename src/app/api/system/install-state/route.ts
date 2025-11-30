// src/app/api/system/install-state/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const count = await prisma.user.count({ where: { role: "ADMIN" } });
        return NextResponse.json({ needsFirstUser: count === 0, dbUp: true });
    } catch (err) {
        console.warn("[install-state] DB not reachable; assuming no redirect to first-user.");
        return NextResponse.json({ needsFirstUser: false, dbUp: false });
    }
}
