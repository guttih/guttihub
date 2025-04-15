import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return redirect("/api/auth/signin"); // or show custom UI
  }

  return (
    <div className="p-6 text-white">
      <h2 className="text-2xl font-semibold mb-2">Welcome, {session.user?.name || session.user?.email}</h2>
      <p>This page is protected and only visible to logged-in users.</p>
    </div>
  );
}
