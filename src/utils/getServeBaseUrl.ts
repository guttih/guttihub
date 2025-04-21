/**
 * Resolves the public base URL for use in recording links.
 * - Uses BASE_URL from env if available
 * - Otherwise, tries to extract from Request headers
 */
export function getServeBaseUrl(req?: Request): string {
    // 1. Explicit override from env
    if (process.env.BASE_URL) return process.env.BASE_URL;
  
    // 2. Fallback: try to extract from request
    try {
      if (req?.headers?.get) {
        const host = req.headers.get("host");
        const proto = req.headers.get("x-forwarded-proto") || "http";
  
        if (host) {
          const url = `${proto}://${host}`;
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[⚠️ getServeBaseUrl] BASE_URL not set. Using fallback from request:",
              url
            );
          }
          return url;
        }
      }
    } catch (err) {
      console.warn("⚠️ Failed to extract base URL from request:", err);
    }
  
    // 3. Hard fail
    throw new Error("❌ Could not determine BASE_URL. Set it in .env or provide a request with headers.");
  }
  