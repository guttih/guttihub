// src/app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@/utils/auth/accessControl";
import ClientApp from "./ClientApp";
// import Link from "next/link";

export default async function ProtectedPage() {
    const session = await auth();

    if (!session) redirect("/login");

    // TODO: Map Prisma Role -> app role string union if needed.
    const role = (session.user as any)?.role as Role | undefined;
    if (!role) redirect("/login");

    // Temporary cast: downstream expects legacy UserRole type
    return <ClientApp userRole={role as unknown as any} />;
}
