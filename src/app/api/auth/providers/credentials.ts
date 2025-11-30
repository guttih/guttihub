// src/app/api/auth/providers/credentials.ts
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { visibleProvidersForUser } from "@/lib/auth/decide";

export const credentialsProvider = CredentialsProvider({
    name: "Credentials",
    credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
        const c = credentials as Record<string, unknown> | undefined;
        const uRaw = c?.username;
        const pRaw = c?.password;

        const username = typeof uRaw === "string" ? uRaw.trim() : "";
        const password = typeof pRaw === "string" ? pRaw : "";
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true, username: true, email: true, role: true, theme: true, profileImage: true, passwordHash: true },
        });
        if (!user) throw new Error("USER_NOT_FOUND");

        const vis = await visibleProvidersForUser(user.id);
        if (!vis.credentials) {
            if (vis.microsoft && vis.google) throw new Error("OAUTH_ONLY"); // both allowed
            if (vis.microsoft) throw new Error("OAUTH_ONLY_MICROSOFT");
            if (vis.google) throw new Error("OAUTH_ONLY_GOOGLE");
            if (vis.steam) throw new Error("OAUTH_ONLY_STEAM");
            throw new Error("OAUTH_ONLY");
        }

        if (!user.passwordHash) throw new Error("NO_LOCAL_PASSWORD");

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new Error("INVALID_PASSWORD");

        // Return minimal NextAuth user shape; extra fields are populated in callbacks
        return {
            id: user.id,
            name: user.username ?? undefined,
            email: user.email ?? undefined,
            image: user.profileImage || undefined,
        };
    },
});
