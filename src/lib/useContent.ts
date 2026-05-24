'use client';

// useContent — Client hook to load an editable-content map for a page.
//
// Initialised with the built-in defaults (from content-defaults.ts) so the
// correct copy renders immediately with no loading flash, then overlaid with
// any admin edits fetched from the public GET /api/content endpoint. If the
// fetch fails, the defaults simply remain in place.

import { useEffect, useState } from 'react';
import { getDefaultsForPage, type ContentMap } from '@/lib/content-defaults';

export function useContent(page: string): ContentMap {
  const [content, setContent] = useState<ContentMap>(() => getDefaultsForPage(page));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/content?page=${encodeURIComponent(page)}`);
        if (!res.ok) return;
        const data = (await res.json()) as ContentMap;
        if (!cancelled && data && typeof data === 'object') {
          setContent((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // Non-fatal: keep defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return content;
}
