// src/lib/auth/decide.ts
import { prisma } from "@/lib/prisma";
import { globalProviders, getLinkedProviders, getUserPolicy, type OAuthPolicy } from "./policy";
import { ProviderId, type OAuthProviderId } from "@/lib/auth/provider-ids";

export async function visibleProvidersForUser(userId: string) {
    const g = globalProviders();
    const policy = await getUserPolicy(userId);
    const linked = await getLinkedProviders(userId);

    let credentials = g[ProviderId.Credentials] && policy.passwordEnabled;
    if (g.disablePasswordWhenLinked && (linked[ProviderId.AzureAd] || linked[ProviderId.Google] || linked[ProviderId.Steam])) {
        credentials = false;
    }

    let microsoft = g[ProviderId.AzureAd];
    let google = g[ProviderId.Google];
    let steam = g[ProviderId.Steam];

    microsoft = enforcePolicy(policy.oauthPolicy, ProviderId.AzureAd, microsoft);
    google = enforcePolicy(policy.oauthPolicy, ProviderId.Google, google);
    steam = enforcePolicy(policy.oauthPolicy, ProviderId.Steam, steam);

    return { credentials, microsoft, google, steam, linked };
}

function enforcePolicy(policy: OAuthPolicy, provider: OAuthProviderId, current: boolean): boolean {
    if (!current) return false;
    switch (policy.kind) {
        case "NONE":
            return false;
        case "ANY":
            return true;
        case "ALLOW_ONLY":
            return policy.allow.includes(provider);
        default:
            return current;
    }
}

export async function preflightForUsername(username: string) {
    const uname = username.trim();
    if (!uname) return { code: null } as const;

    const user = await prisma.user.findUnique({ where: { username: uname }, select: { id: true } });
    if (!user) return { code: null } as const;

    const vis = await visibleProvidersForUser(user.id);
    if (!vis.credentials && (vis.microsoft || vis.google || vis.steam)) {
        const providers = [] as Array<"microsoft" | "google" | "steam">;
        if (vis.microsoft) providers.push("microsoft");
        if (vis.google) providers.push("google");
        if (vis.steam) providers.push("steam");

        if (providers.length === 1) {
            const only = providers[0];
            if (only === "microsoft") return { code: "OAUTH_ONLY_MICROSOFT" as const, providers };
            if (only === "google") return { code: "OAUTH_ONLY_GOOGLE" as const, providers };
            return { code: "OAUTH_ONLY_STEAM" as const, providers };
        }
        return { code: "OAUTH_ONLY" as const, providers };
    }
    return { code: null } as const;
}

