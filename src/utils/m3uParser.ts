import { M3UEntry } from '@/types/M3UEntry';

export function m3uParser(content: string): M3UEntry[] {
    const lines = content.split(/\r?\n/);
    const entries: M3UEntry[] = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
  
      if (line.startsWith('#EXTINF')) {
        const url = lines[i + 1]?.trim() || '';
  
        const tvgIdMatch = line.match(/tvg-id="(.*?)"/i);
        const tvgNameMatch = line.match(/tvg-name="(.*?)"/i);
        const tvgLogoMatch = line.match(/tvg-logo="(.*?)"/i);
        const groupTitleMatch = line.match(/group-title="(.*?)"/i);
        const nameMatch = line.match(/,(.*)$/);
  
        entries.push({
          tvgId: tvgIdMatch?.[1] || '',
          tvgName: tvgNameMatch?.[1] || '',
          tvgLogo: tvgLogoMatch?.[1] || '',
          groupTitle: groupTitleMatch?.[1] || '',
          name: nameMatch?.[1]?.trim() || '',
          url,
        });
  
        i++; // skip the URL line
      }
    }
  
    return entries;
  }