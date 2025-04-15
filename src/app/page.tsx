// src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/authOptions";
import { redirect } from "next/navigation";
import ClientApp from "./ClientApp";
import { getUserRole } from "@/utils/getUserRole";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const role = getUserRole(session.user?.email);

  if (!role) {
    console.warn("Unauthorized access attempt:", session.user?.email);
    redirect("/api/auth/signin");
  }

  return <ClientApp role={role} />;
}