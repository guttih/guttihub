// src/components/User/UserForm.tsx
"use client";
import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import type { UserFormData } from "@/types/user";
import { Theme } from "@prisma/client";
import { Button } from "@/components/ui/Button/Button";

interface UserFormProps {
    initialData?: Partial<UserFormData>;
    isAdmin?: boolean;
    onSubmit: (data: UserFormData) => void;
    formId?: string;
    hideSubmit?: boolean;
}

export default function UserForm({ initialData = {}, isAdmin = false, onSubmit, formId, hideSubmit = false }: UserFormProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        id: initialData.id,
        username: initialData.username || "",
        email: initialData.email || "",
        password: "",
        role: initialData.role || "VIEWER",
        theme: initialData.theme || "light",
        profileImage: initialData.profileImage || "",
    });

    const availableThemes = Object.values(Theme);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        let profileImagePath = formData.profileImage;
        if (selectedFile && formData.id) {
            const uploadForm = new FormData();
            uploadForm.append("file", selectedFile);
            uploadForm.append("filename", `user-${formData.id}`);
            const res = await fetch("/api/upload/profile-image", { method: "POST", body: uploadForm });
            if (res.ok) {
                const data = await res.json();
                profileImagePath = data.path;
            }
        }
        onSubmit({ ...formData, profileImage: profileImagePath });
    }

    const inputClass =
        "mt-1 block w-full px-4 py-2 border rounded-md shadow-sm bg-[var(--input-bg)] text-[var(--foreground)] border-[var(--border)] focus:ring-blue-500 focus:border-blue-500";

    return (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-semibold text-center mb-4 text-[var(--foreground)]">{initialData.id ? "Edit User" : "Create User"}</h2>

            {formData.id && <ImageUpload value={formData.profileImage} onChange={(file) => setSelectedFile(file)} filename={`user-${formData.id}`} />}

            <div>
                <label htmlFor="username" className="block text-sm font-medium text-[var(--foreground)]">
                    Username
                </label>
                <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} required className={inputClass} />
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
                    Email
                </label>
                <input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} className={inputClass} />
            </div>

            <div>
                <label htmlFor="theme" className="block text-sm font-medium text-[var(--foreground)]">
                    Theme
                </label>
                <select id="theme" name="theme" value={formData.theme} onChange={handleChange} className={inputClass}>
                    {availableThemes.map((theme) => (
                        <option key={theme} value={theme}>
                            {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {isAdmin && (
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-[var(--foreground)]">
                        Role
                    </label>
                    <select id="role" name="role" value={formData.role} onChange={handleChange} className={inputClass}>
                        <option value="VIEWER">Viewer</option>
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
            )}

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
                    Password {initialData.id && <span className="text-sm text-[var(--muted)]">(leave blank to keep current)</span>}
                </label>
                <input id="password" name="password" type="password" value={formData.password || ""} onChange={handleChange} className={inputClass} />
            </div>

            {hideSubmit ? <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1} /> : <Button type="submit" variant="important" className="w-full py-2 px-4">Save</Button>}
        </form>
    );
}

