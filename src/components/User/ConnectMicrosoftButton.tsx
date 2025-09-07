// src/components/User/ConnectMicrosoftButton.tsx
"use client";
import { Button } from "@/components/ui/Button/Button";
import { signIn } from "next-auth/react";
import { ProviderId } from "@/lib/auth/provider-ids";

export default function ConnectMicrosoftButton() {
    return (
        <Button onClick={() => signIn(ProviderId.AzureAd, { callbackUrl: "/profile?linked=ms" })} className="w-full py-2 px-4" title="Link your Microsoft account to this user">
            Connect Microsoft account
        </Button>
    );
}

