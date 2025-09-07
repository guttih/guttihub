// src/app/api/system/install-state/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const count = await prisma.user.count({ where: { role: "ADMIN" } });
    return NextResponse.json({ needsFirstUser: count === 0 });
}

