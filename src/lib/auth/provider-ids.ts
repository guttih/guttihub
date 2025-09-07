// src/lib/auth/provider-ids.ts

export const ProviderId = {
    Credentials: "credentials",
    AzureAd: "azure-ad",
    Google: "google",
    Steam: "steam",
} as const;

export type ProviderId = (typeof ProviderId)[keyof typeof ProviderId];
export type OAuthProviderId = Exclude<ProviderId, typeof ProviderId.Credentials>;

export const ProviderLabel: Record<OAuthProviderId | typeof ProviderId.Credentials, string> = {
    [ProviderId.Credentials]: "Username & Password",
    [ProviderId.AzureAd]: "Microsoft",
    [ProviderId.Google]: "Google",
    [ProviderId.Steam]: "Steam",
};

export function isOAuthProviderId(x: ProviderId): x is OAuthProviderId {
    return x !== ProviderId.Credentials;
}

