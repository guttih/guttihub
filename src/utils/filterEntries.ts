import { TextFilter } from "@/types/TextFilter";
import { M3UEntry } from "@/types/M3UEntry";
import { FetchM3URequest } from "@/types/FetchM3URequest";
import { inferContentCategory } from "@/types/ContentCategoryFieldLabel";

function matchTextFilter(fieldValue: string, filter?: TextFilter): boolean {
    if (!filter || !filter.value) return true;

    try {
        if (filter.isRegex) {
            const regex = new RegExp(filter.value, filter.isCaseSensitive ? "" : "i");
            return regex.test(fieldValue);
        } else {
            return filter.isCaseSensitive ? fieldValue.includes(filter.value) : fieldValue.toLowerCase().includes(filter.value.toLowerCase());
        }
    } catch {
        console.warn("Invalid regex:", filter.value);
        return false;
    }
}

export function filterEntries(entries: M3UEntry[], filters: FetchM3URequest["filters"] = {}): M3UEntry[] {
    return entries.filter((entry) => {
        const nameMatch = matchTextFilter(entry.name, filters.name);
        const groupMatch = matchTextFilter(entry.groupTitle, filters.groupTitle);
        const idMatch = matchTextFilter(entry.tvgId, filters.tvgId);
        const formatMatch = !filters.format
  ? true
  : filters.format === "unknown"
    ? !entry.url.split("/").pop()?.includes(".")
    : entry.url.toLowerCase().endsWith(`.${filters.format}`);

        const categoryMatch = filters.category ? inferContentCategory(entry.url) === filters.category : true;
        const yearsMatch = Array.isArray(filters.years) && filters.years.length > 0 ? filters.years.some((year) => entry.name.includes(year)) : true;

        return nameMatch && groupMatch && idMatch && formatMatch && categoryMatch && yearsMatch;
    });
}
