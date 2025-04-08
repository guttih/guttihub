import { parseM3U } from '@/utils/parseM3U';


import { promises as fs } from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('parseM3U', () => {
  it('parses test.m3u correctly', async () => {
    const filePath = path.resolve(__dirname, 'assets/test.m3u');
    const content = await fs.readFile(filePath, 'utf-8');
    const entries = parseM3U(content);

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]).toHaveProperty('name');
    expect(entries[0]).toHaveProperty('url');
  });
});
