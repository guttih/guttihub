import authorizedUsersJson from "@/config/authorizedUsers.json";

const authorizedUsers: Record<string, string> = authorizedUsersJson;

export function getUserRole(email?: string | null | undefined): string | null {
    if (!email) {
        console.warn("⚠️ getUserRole called without an email");
        return null;
    }

    return authorizedUsers[email] || null;
}
