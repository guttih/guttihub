// utils/parseM3U.ts

import { M3UEntry } from "@/types/M3UEntry";

/**
 * More robust parser — handles multiple commas in metadata by preserving the last part as the name.
 */
export function parseM3U(content: string): M3UEntry[] {
  const lines = content.split("\n").map((line) => line.trim());
  const entries: M3UEntry[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (line.startsWith("#EXTINF")) {
      const url = lines[i + 1];

      const lastCommaIndex = line.lastIndexOf(",");
      const infoLine = line.substring(0, lastCommaIndex);
      const name = line.substring(lastCommaIndex + 1).trim();

      const tvgId = getAttribute(infoLine, "tvg-id");
      const tvgName = getAttribute(infoLine, "tvg-name");
      const tvgLogo = getAttribute(infoLine, "tvg-logo");
      const groupTitle = getAttribute(infoLine, "group-title");

      entries.push({
        name,
        url,
        tvgId: tvgId || "",
        tvgName: tvgName || "",
        tvgLogo: tvgLogo || "",
        groupTitle: groupTitle || "",
      });
    }
  }

  return entries;
}

/**
 * Extracts an attribute from the #EXTINF metadata line.
 */
function getAttribute(input: string, key: string): string | undefined {
  const match = input.match(new RegExp(`${key}="([^"]*)"`));
  return match?.[1];
}



// /**
//  * assumes the line is formatted correctly with a single comma.
//  */
// export function parseM3UFast(content: string): M3UEntry[] {
//   const lines = content.split("\n").map((line) => line.trim());
//   const entries: M3UEntry[] = [];

//   for (let i = 0; i < lines.length - 1; i++) {
//     const line = lines[i];
//     if (line.startsWith("#EXTINF")) {
//       const url = lines[i + 1];
//       const [infoLine, name] = line.split(/,(.+)/); // splits only on first comma

//       const tvgId = getAttribute(infoLine, "tvg-id");
//       const tvgName = getAttribute(infoLine, "tvg-name");
//       const tvgLogo = getAttribute(infoLine, "tvg-logo");
//       const groupTitle = getAttribute(infoLine, "group-title");

//       entries.push({
//         name: name?.trim() || "",
//         url,
//         tvgId: tvgId || "",
//         tvgName: tvgName || "",
//         tvgLogo: tvgLogo || "",
//         groupTitle: groupTitle || "",
//       });
//     }
//   }

//   return entries;
// }
