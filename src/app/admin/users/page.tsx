// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import UserForm from "@/components/User/UserForm";
import { UserFormData } from "@/types/user";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import ConnectedAccountsPanel from "@/components/User/ConnectedAccountsPanel";
import { useSession, signOut } from "next-auth/react";
import { showMessageBox } from "@/components/ui/MessageBox";
import { Role } from "@prisma/client";
import Modal from "@/components/ui/Modal";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserFormData[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/admin/users");
                if (!res.ok) throw new Error("Unauthorized or server error");
                const data = await res.json();
                setUsers(data);
            } catch (err: unknown) {
                if (err instanceof Error) setError(err.message);
                else setError("An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleFormSubmit = async (userData: UserFormData) => {
        const method = userData.id ? "PATCH" : "POST";
        const url = userData.id ? `/api/admin/users/${userData.id}` : "/api/admin/users";

        let oldRole = userData.role;
        if (userData.id) {
            const res = await fetch(url);
            if (res.ok) {
                const { role } = await res.json();
                oldRole = role;
                if (role === Role.ADMIN && userData.role !== Role.ADMIN) {
                    const stats = await fetch("/api/admin/stats");
                    const { adminCount } = await stats.json();
                    if (adminCount <= 1) {
                        showMessageBox({
                            variant: "error",
                            title: "Admin Demotion",
                            message: "The system needs at least one admin user. You cannot demote the last admin.",
                            buttonText: "Close and cancel",
                        });
                        return;
                    }
                }
            }
        }

        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(userData) });
        if (res.ok) {
            const updatedUser = await res.json();
            if (session?.user?.id === userData.id) {
                // If the logged-in user changed their own role, sign them out to refresh permissions
                if (oldRole !== userData.role) {
                    await signOut({ redirect: true, callbackUrl: "/login" });
                    return;
                }
            }
            if (userData.id) setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
            else setUsers((prev) => [...prev, updatedUser]);
            setSelectedUser(null);
        } else {
            let message = "Failed to save user";
            try {
                const ct = res.headers.get("content-type") || "";
                if (ct.includes("application/json")) {
                    const data = await res.json();
                    message = data?.error?.message || message;
                } else {
                    const text = await res.text();
                    if (text) message = text;
                }
            } catch {}
            showMessageBox({ variant: "error", title: "Problem", message, buttonText: "Close" });
        }
    };

    const handleDeleteUser = async (id: string) => {
        const harakiri = session?.user?.id === id;

        if (harakiri) {
            const stats = await fetch("/api/admin/stats");
            const { adminCount } = await stats.json();
            if (adminCount <= 1) {
                showMessageBox({
                    variant: "error",
                    title: "Admin Deletion",
                    message: "The system needs at least one admin user. You cannot delete your own account.",
                    buttonText: "Close and cancel",
                });
                return;
            }
        }

        if (!window.confirm("Are you sure you want to delete this user?")) return;

        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        if (res.ok) {
            setUsers((prev) => prev.filter((u) => u.id !== id));
            if (harakiri) await signOut({ redirect: true, callbackUrl: "/login" });
        } else {
            showMessageBox({ variant: "error", title: "Problem", message: "Failed to delete user", buttonText: "Close" });
        }
    };

    if (loading) return <div className="p-6">Loading users…</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">User Management</h1>
                <Button onClick={() => setSelectedUser({ username: "", email: "", role: Role.VIEWER })} className="py-2 px-4">+ New User</Button>
            </div>

            <div className="overflow-x-auto rounded border border-gray-700">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-800 text-left text-white/80">
                        <tr>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} className="border-t border-gray-700 hover:bg-gray-900/60">
                                <td className="px-4 py-3">
                                    <button className="underline" onClick={() => setSelectedUser(u)}>{u.username}</button>
                                </td>
                                <td className="px-4 py-3">{u.email}</td>
                                <td className="px-4 py-3">{String(u.role ?? "")}</td>
                                <td className="px-4 py-3">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ""}</td>
                                <td className="px-4 py-3 text-right">
                                    <Button variant="darker" onClick={() => handleDeleteUser(u.id!)} className="py-1 px-2">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                open={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                title={selectedUser?.id ? "Edit User" : "New User"}
                widthClassName="max-w-lg"
                footer={
                    <div className="flex justify-end">
                        <Button type="submit" form="admin-user-form" variant="important" className="py-2 px-4">Save</Button>
                    </div>
                }
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <UserForm initialData={selectedUser} isAdmin onSubmit={handleFormSubmit} formId="admin-user-form" hideSubmit />
                        {selectedUser.id && <ConnectedAccountsPanel userId={selectedUser.id} allowUnlink />}
                    </div>
                )}
            </Modal>
        </div>
    );
}
