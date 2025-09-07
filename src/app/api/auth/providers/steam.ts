// src/app/api/auth/providers/steam.ts
import SteamProvider from "steam-next-auth";

const steamProvider = (req: Request) =>
    SteamProvider(req, {
        clientSecret: process.env.STEAM_API_KEY!,
        callbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/steam-bridge`,
    });

export default steamProvider;

