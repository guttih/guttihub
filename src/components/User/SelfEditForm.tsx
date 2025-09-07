// src/components/User/SelfEditForm.tsx
"use client";
import { useEffect, useState } from "react";
import UserForm from "@/components/User/UserForm";
import { UserFormData } from "@/types/user";

export default function SelfEditForm({ formId }: { formId?: string }) {
    const [userData, setUserData] = useState<Partial<UserFormData> | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetch("/api/user/self")
            .then((res) => res.json())
            .then((data) => {
                setUserData({ id: data.id, username: data.username, email: data.email, theme: data.theme, profileImage: data.profileImage });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    async function handleSubmit(updatedData: UserFormData) {
        try {
            const { id, username, email, password, theme, profileImage } = updatedData;
            const res = await fetch("/api/user/self", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, username, email, password, theme, profileImage }) });
            if (!res.ok) throw new Error("Update failed");
        } catch (err) {
            console.error(err);
            setMessage("Error updating profile ❌");
        }
    }

    if (loading) return <p>Loading...</p>;
    if (!userData) return <p>Unable to load user data.</p>;

    return (
        <>
            {message && <p className="text-sm text-center text-red-600 mb-4">{message}</p>}
            <UserForm initialData={userData} isAdmin={false} onSubmit={handleSubmit} formId={formId} hideSubmit={!!formId} />
        </>
    );
}

