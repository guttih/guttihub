import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasModeratorAccess } from "@/utils/auth/accessControl";
import DownloadQueue from "@/components/DownloadQueue/DownloadQueue";

export default async function DownloadPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (!hasModeratorAccess(session.user)) redirect("/");
    return <DownloadQueue />;
}
