// src/lib/auth/policy.ts
import { ProviderId, type OAuthProviderId } from "@/lib/auth/provider-ids";

export function envBool(v: string | undefined, def = false) {
    const s = (v ?? "").trim().toLowerCase();
    if (!s) return def;
    return ["true", "1", "yes", "on"].includes(s) ? true : !["false", "0", "no", "off"].includes(s) ? def : false;
}

export function globalProviders() {
    const credentials = envBool(process.env.AUTH_CREDENTIALS_ENABLED, true);
    const microsoft = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);
    const google = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const steam = !!process.env.STEAM_API_KEY;

    const disablePasswordWhenLinked = envBool(process.env.DISABLE_PASSWORD_WHEN_LINKED_ACCOUNT, false);

    return {
        [ProviderId.Credentials]: credentials,
        [ProviderId.AzureAd]: microsoft,
        [ProviderId.Google]: google,
        [ProviderId.Steam]: steam,
        disablePasswordWhenLinked,
    } as const;
}

export type LinkedProviders = Record<OAuthProviderId, boolean>;

export type OAuthPolicy = { kind: "ANY" } | { kind: "NONE" } | { kind: "ALLOW_ONLY"; allow: readonly OAuthProviderId[] };

export async function getUserPolicy(_userId: string): Promise<{ passwordEnabled: boolean; oauthPolicy: OAuthPolicy }> {
    void _userId; // intentionally unused for now
    return { passwordEnabled: true, oauthPolicy: { kind: "ANY" } };
}

import { prisma } from "@/lib/prisma";
export async function getLinkedProviders(userId: string): Promise<LinkedProviders> {
    const inList: OAuthProviderId[] = [ProviderId.AzureAd, ProviderId.Google, ProviderId.Steam];
    const accounts = await prisma.account.findMany({ where: { userId, provider: { in: inList } }, select: { provider: true } });
    const set = new Set(accounts.map((a) => a.provider as OAuthProviderId));
    return {
        [ProviderId.AzureAd]: set.has(ProviderId.AzureAd),
        [ProviderId.Google]: set.has(ProviderId.Google),
        [ProviderId.Steam]: set.has(ProviderId.Steam),
    };
}
