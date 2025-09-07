// src/app/first-user/page.tsx
"use client";
import { useEffect, useState } from "react";
import UserForm from "@/components/User/UserForm";
import type { UserFormData } from "@/types/user";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function FirstUserPage() {
    const router = useRouter();
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/system/install-state");
            if (!res.ok) { setAllowed(false); return; }
            const data = await res.json();
            setAllowed(data.needsFirstUser === true);
            if (!data.needsFirstUser) router.replace("/login");
        })();
    }, [router]);

    if (allowed === null) return <p>Loading…</p>;
    if (!allowed) return null;

    const handleSubmit = async (data: UserFormData) => {
        const res = await fetch("/api/bootstrap/first-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: data.username, email: data.email, password: data.password, theme: data.theme, role: "ADMIN" }) });
        if (!res.ok) { return; }
        const login = await signIn("credentials", { username: data.username, password: data.password, redirect: false });
        if (login?.error) { router.replace("/login"); return; }
        router.replace("/");
    };

    return (
        <div className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Create the first admin</h1>
            <p className="mb-4 text-sm opacity-80">This app has no users yet. Create the first account—this one will be an Admin.</p>
            <UserForm initialData={{ username: "", email: "", role: "ADMIN" }} isAdmin={false} onSubmit={handleSubmit} />
        </div>
    );
}
