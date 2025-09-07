// src/app/api/auth/providers/index.ts
import { credentialsProvider } from "./credentials";
import azureAdProvider from "./azure-ad";
import googleProvider from "./google";
import steamProvider from "./steam";
import type { Provider } from "next-auth/providers";

function envBool(name: string, def = true) {
    const v = (process.env[name] ?? "").trim().toLowerCase();
    if (!v) return def;
    return !["false", "0", "no", "off"].includes(v);
}

// Accept a generic Request. It may be undefined in some RSC contexts.
export function getProviders(req?: Request): Provider[] {
    const providers: Provider[] = [];

    if (envBool("AUTH_CREDENTIALS_ENABLED", true)) providers.push(credentialsProvider);
    if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) providers.push(azureAdProvider());
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) providers.push(googleProvider());

    const steamKey = (process.env.STEAM_API_KEY ?? "").trim();
    if (steamKey) {
        const steamOk = !!steamKey && /^[0-9A-Fa-f]{32}$/.test(steamKey);

        if (!steamOk) {
            console.warn("[steam] STEAM_API_KEY is set but invalid; skipping Steam provider.");
        }

        if (steamOk && req) {
            providers.push(steamProvider(req));
        }
    }

    return providers;
}

export default getProviders;

