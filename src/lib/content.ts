// content.ts — Server-side content lookups (Prisma-backed).
//
// Public pages call getContentMap()/getContent() to fetch admin-editable copy.
// Database rows are merged over the built-in defaults from content-defaults.ts,
// so a missing/absent key always falls back to its default string and the page
// never breaks. Only keys present in the defaults registry are surfaced.

import { prisma } from '@/lib/prisma';
import {
  ContentMap,
  ContentValue,
  getDefaultContent,
  getDefaultsForPage,
} from '@/lib/content-defaults';

/**
 * Returns a key -> {value, format} map for every block on `page`, with any
 * database overrides applied on top of the defaults. Falls back to defaults
 * entirely if the database is unreachable.
 */
export async function getContentMap(page: string): Promise<ContentMap> {
  const map = getDefaultsForPage(page);

  try {
    const rows = await prisma.contentBlock.findMany({ where: { page } });
    for (const row of rows) {
      // Only surface keys we know about from the defaults registry.
      if (map[row.key]) {
        map[row.key] = { value: row.value, format: row.format };
      }
    }
  } catch (error) {
    console.error(`getContentMap("${page}") failed, using defaults:`, error);
  }

  return map;
}

/**
 * Returns a single block's {value, format}, falling back to its default.
 */
export async function getContent(key: string): Promise<ContentValue> {
  const fallback = getDefaultContent(key);

  try {
    const row = await prisma.contentBlock.findUnique({ where: { key } });
    if (row) return { value: row.value, format: row.format };
  } catch (error) {
    console.error(`getContent("${key}") failed, using default:`, error);
  }

  return fallback;
}
