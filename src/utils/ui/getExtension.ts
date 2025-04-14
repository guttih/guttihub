export function getExtension(url: string): string | null {
    try {
        const path = new URL(url).pathname;
        const extMatch = path.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
        return extMatch ? extMatch[1] : null;
    } catch {
        return null;
    }
}
