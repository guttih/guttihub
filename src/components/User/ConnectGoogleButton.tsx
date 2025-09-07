// src/components/User/ConnectGoogleButton.tsx
"use client";
import { Button } from "@/components/ui/Button/Button";
import { signIn } from "next-auth/react";
import { ProviderId } from "@/lib/auth/provider-ids";

export default function ConnectGoogleButton() {
    return (
        <Button onClick={() => signIn(ProviderId.Google, { callbackUrl: "/profile?linked=google", prompt: "select_account" })} className="w-full py-2 px-4" title="Link your Google account to this user">
            Connect Google account
        </Button>
    );
}

