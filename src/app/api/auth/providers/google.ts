// src/app/api/auth/providers/google.ts
import GoogleProvider from "next-auth/providers/google";

type GoogleProfile = {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
};

const googleProvider = () =>
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        // Always show account picker while testing
        authorization: { params: { prompt: "select_account" } },
        profile(p: GoogleProfile) {
            return {
                id: p.sub!,
                email: p.email ?? null,
                name: p.name ?? null,
                image: p.picture ?? null,
            };
        },
    });

export default googleProvider;

