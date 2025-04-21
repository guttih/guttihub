export function getFrontendBaseUrl(): string {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
  
    // Fail on server-side render
    throw new Error("getFrontendBaseUrl called outside browser context.");
  }
  