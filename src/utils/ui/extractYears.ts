import { M3UEntry } from "@/types/M3UEntry";

export function extractYears(entries: M3UEntry[]): string[] {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
  
    for (const entry of entries) {
      // Match all years in parentheses like (1998), (2021), etc.
      const matches = entry.name.match(/\((19|20)\d{2}\)/g);
  
      if (matches && matches.length > 0) {
        // Extract just the year number (strip parentheses)
        const numericYears = matches
          .map((y) => parseInt(y.slice(1, -1)))
          .filter((y) => y <= currentYear && y >= 1930); // Optional lower bound
  
        if (numericYears.length > 0) {
          const latest = Math.max(...numericYears);
          years.add(latest.toString());
        }
      }
    }
  
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }
  