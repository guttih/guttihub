// src/utils/router/getSearchParams.ts

/**
 * Safely extracts and type-checks `searchParams` from a Server Component `props` object.
 *
 * This utility exists to work around a known issue in Next.js (v15.x) where manually typing
 * the `searchParams` field in Server Component route handlers can lead to false-positive
 * TypeScript errors during `next build`. Specifically, you may see:
 *
 *    "Type is missing the following properties from type 'Promise<any>': then, catch, finally..."
 *
 * This happens because Next.js's build system expects exact type inference of the props shape
 * for routes, and manual typings can conflict with internal expectations.
 *
 * By using `props: unknown` and safely narrowing it here, we:
 *  - Avoid direct dependency on Next.js internal types
 *  - Ensure safety without using `any`
 *  - Keep the `RecordPage`, `SearchPage`, etc. clean and readable
 *
 * @param props - the props passed to your route/page component
 * @returns the typed `searchParams` object if valid, or `null` if not present or malformed
 */
export function getSearchParams<T>(props: unknown): T | null {
    if (
      !props ||
      typeof props !== "object" ||
      !("searchParams" in props)
    ) {
      return null;
    }
  
    const maybeWithParams = props as { searchParams?: unknown };
  
    if (typeof maybeWithParams.searchParams !== "object" || maybeWithParams.searchParams === null) {
      return null;
    }
  
    return maybeWithParams.searchParams as T;
  }
  