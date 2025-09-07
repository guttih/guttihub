// src/components/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button/Button";

export default function LogoutButton() {
    return <Button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</Button>;
}
