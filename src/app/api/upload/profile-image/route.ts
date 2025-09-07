// src/app/api/upload/profile-image/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { auth } from "@/auth";

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"] as const;

export async function POST(req: Request) {
    // Require an authenticated session
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const providedFilename = formData.get("filename") as string | null;

    if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = "." + (file.name.split(".").pop() || "jpg").toLowerCase();
    const baseFilename = (providedFilename && providedFilename.trim()) || `user-${randomUUID()}`;
    const fullFileName = `${baseFilename}${ext}`;
    const uploadDir = path.join(process.cwd(), "public/uploads/avatars");
    const filePath = path.join(uploadDir, fullFileName);

    await fs.mkdir(uploadDir, { recursive: true });

    // Delete old files with the same base name but different extension
    await Promise.all(
        allowedExtensions.map(async (extension) => {
            const altPath = path.join(uploadDir, `${baseFilename}${extension}`);
            if (altPath !== filePath) {
                try { await fs.unlink(altPath); } catch { /* ignore */ }
            }
        })
    );

    await fs.writeFile(filePath, buffer);
    return NextResponse.json({ path: `/uploads/avatars/${fullFileName}` });
}

