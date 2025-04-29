// src/app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/authOptions";
import { redirect } from "next/navigation";
import { getUserRole } from "@/config";
import ClientApp from "./ClientApp";
import Link from "next/link";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Welcome to Guttihub 📺</h1>
        <Link
          href="/api/auth/signin"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-lg font-semibold"
        >
          Sign in with Google
        </Link>
      </div>
    );
  }

  const role = getUserRole(session.user?.email);

  if (!role) {
    console.warn("Unauthorized access attempt:", session.user?.email);
    redirect("/signin");
  }

  return <ClientApp userRole={role} />;
}
