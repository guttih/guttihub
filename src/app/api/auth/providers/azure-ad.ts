// src/app/api/auth/providers/azure-ad.ts
import AzureADProvider from "next-auth/providers/azure-ad";

type AzureProfile = {
    sub?: string;
    id?: string;
    name?: string;
    email?: string;
    preferred_username?: string;
};

const azureAdProvider = () =>
    AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        authorization: {
            params: {
                prompt: "select_account",
            },
        },
        profile(p: AzureProfile) {
            const email = p.email ?? p.preferred_username ?? null;
            return {
                id: p.sub ?? p.id!,
                name: p.name ?? null,
                email,
                image: null,
            };
        },
    });

export default azureAdProvider;

