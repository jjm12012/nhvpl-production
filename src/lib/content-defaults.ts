// content-defaults.ts — Pure, dependency-free content defaults.
//
// This module is the runtime fallback counterpart to prisma/seed.js: both
// read the same src/lib/content-blocks.json registry, so the seeded database
// values and the built-in fallbacks can never drift out of sync.
//
// IMPORTANT: this file must stay free of server-only imports (e.g. Prisma) so
// it can be imported from both Server Components and Client Components. The
// Prisma-backed lookups live in src/lib/content.ts.

import blocksJson from './content-blocks.json';

export type ContentFormat = 'TEXT' | 'MARKDOWN';

export interface ContentValue {
  value: string;
  format: ContentFormat;
}

export interface ContentBlockDefault extends ContentValue {
  key: string;
  page: string;
  label: string;
}

const rawBlocks = (blocksJson as { blocks: Array<Record<string, string>> }).blocks;

export const CONTENT_DEFAULTS: ContentBlockDefault[] = rawBlocks.map((b) => ({
  key: b.key,
  page: b.page,
  label: b.label,
  value: b.value,
  format: b.format === 'MARKDOWN' ? 'MARKDOWN' : 'TEXT',
}));

// Fast key -> default lookup.
const DEFAULTS_BY_KEY: Record<string, ContentBlockDefault> = Object.fromEntries(
  CONTENT_DEFAULTS.map((b) => [b.key, b])
);

/** Default {value, format} for a single key (empty TEXT if the key is unknown). */
export function getDefaultContent(key: string): ContentValue {
  const d = DEFAULTS_BY_KEY[key];
  return d ? { value: d.value, format: d.format } : { value: '', format: 'TEXT' };
}

/** All default blocks for a given page, as a key -> {value, format} map. */
export function getDefaultsForPage(page: string): Record<string, ContentValue> {
  const map: Record<string, ContentValue> = {};
  for (const b of CONTENT_DEFAULTS) {
    if (b.page === page) map[b.key] = { value: b.value, format: b.format };
  }
  return map;
}

/** The set of valid (seed-defined) keys. Used to reject edits to unknown keys. */
export const VALID_CONTENT_KEYS: ReadonlySet<string> = new Set(
  CONTENT_DEFAULTS.map((b) => b.key)
);

export type ContentMap = Record<string, ContentValue>;
