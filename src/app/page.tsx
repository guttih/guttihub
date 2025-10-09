// src/app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ClientApp from "./ClientApp";
// import Link from "next/link";

export default async function ProtectedPage() {
    const session = await auth();

    if (!session) redirect("/login");

    // TODO: Map Prisma Role -> app role string union if needed.
    const { user } = session;
    if (!user?.role) redirect("/login");

    return <ClientApp userRole={user.role} />;
}
