// src/app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@/utils/auth/accessControl";
import ClientApp from "./ClientApp";
// import Link from "next/link";

export default async function ProtectedPage() {
    const session = await auth();

    if (!session) redirect("/login");

    // Resolve user role from session in a type-safe way
    const role = (session.user as { role?: Role })?.role;
    if (!role) redirect("/login");

    return <ClientApp userRole={role} />;
}
