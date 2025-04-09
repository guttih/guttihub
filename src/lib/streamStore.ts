// lib/streamStore.ts

if (!globalThis.__streamStore) {
    globalThis.__streamStore = new Map<string, string>();
  }
  
  const streamStore: Map<string, string> = globalThis.__streamStore;
  
  export function saveStreamUrl(url: string): string {
    const id = Math.random().toString(36).substring(2, 10);
    streamStore.set(id, url);
    console.log("saveStreamUrl Generated ID:", id, "for URL:", url);
    return id;
  }
  
  export function getStreamUrl(id: string): string | undefined {
    const url = streamStore.get(id);
    console.log("getStreamUrl ID:", id, "=> URL:", url);
    return url;
  }
  