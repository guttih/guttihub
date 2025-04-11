import { M3UEntry } from "@/types/M3UEntry";

// Replaces credentials in URL with USR:PWD
export function sanitizeUrl(url: string, username: string, password: string): string {
    if (!username || !password) return url;
    return url
      .replaceAll(username, 'USR')
      .replaceAll(password, 'PWD');
  }
  
  export function unsanitizeUrl(url: string, username: string, password: string): string {
    if (!username || !password) return url;
    return url
      .replaceAll('USR', username)
      .replaceAll('PWD', password);
  }

  export function sanitizeM3UUrls(entries: M3UEntry[], username: string, password: string): M3UEntry[] {
    if (!username || !password){
        console.warn("No username or password provided for sanitization, so no sanitization will be done.");
        return entries;
    }
    return entries.map((entry) => ({
      ...entry,
      url: sanitizeUrl(entry.url, username, password),
    }));
  }
