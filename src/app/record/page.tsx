import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/authOptions";
import { readJsonFile, getCacheDir } from "@/utils/fileHandler";
import RecordForm from "./RecordForm";
import { M3UEntry } from "@/types/M3UEntry";

export default async function RecordPage(props: unknown) {
    if (
      !props ||
      typeof props !== "object" ||
      !("searchParams" in props) ||
      typeof props.searchParams !== "object"
    ) {
      throw new Error("Invalid props passed to RecordPage");
    }
  
    const { searchParams } = props as { searchParams?: { cacheKey?: string } };
    const cacheKey = searchParams?.cacheKey;
  
    const session = await getServerSession(authOptions);
    if (!session) redirect("/api/auth/signin");
  
    if (!cacheKey) return notFound();
  
    let entry: M3UEntry;
    try {
      const path = `${getCacheDir()}/${cacheKey}.json`;
      entry = await readJsonFile<M3UEntry>(path);
    } catch {
      return notFound();
    }
  
    return (
      <RecordForm
        entry={entry}
        cacheKey={cacheKey}
        userEmail={session.user?.email ?? "unknown"}
      />
    );
  }
  
