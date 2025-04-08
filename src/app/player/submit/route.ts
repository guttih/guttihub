import { saveStreamUrl } from '@/lib/streamStore';

import { redirect } from "next/navigation";

export async function POST(request: Request) {
    const formData = await request.formData();
    const url = formData.get("url") as string;

    console.log("Received stream URL:", url); // ✅ Debug line

    if (!url || !url.startsWith("http")) {
        console.error("Invalid or missing stream URL");
        return new Response("Invalid stream URL", { status: 400 });
    }

    const id = saveStreamUrl(url);
    redirect(`/player/${id}`);
}
