// Content.tsx — Safe renderer for admin-editable content blocks.
//
// Renders a block's value according to its format:
//   - TEXT:     rendered as plain text (React escapes it; no markup).
//   - MARKDOWN: rendered through a tiny, dependency-free parser that emits
//               ONLY a whitelisted set of React elements — links (with href
//               protocol validation), bold, italic, lists, paragraphs, and
//               line breaks. No raw HTML is ever interpreted, so admin input
//               cannot inject scripts or arbitrary markup.
//
// This is a "shared" component (no 'use client' directive and no hooks), so it
// can be used from both Server and Client Components.

import React from 'react';
import type { ContentValue } from '@/lib/content-defaults';

const LINK_CLASS = 'text-primary-600 hover:text-primary-700 underline font-medium';

/** Only allow links to root-relative paths, http(s), and mailto. */
function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|\/)/i.test(href.trim());
}

const INLINE_TOKEN =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/;

/** Parse inline markdown (links, bold, italic) into React nodes. */
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let i = 0;

  while (remaining.length > 0) {
    const m = INLINE_TOKEN.exec(remaining);
    if (!m) {
      nodes.push(remaining);
      break;
    }

    if (m.index > 0) nodes.push(remaining.slice(0, m.index));
    const key = `${keyPrefix}-${i}`;

    if (m[1] !== undefined && m[2] !== undefined) {
      const linkText = m[1];
      const href = m[2];
      if (isSafeHref(href)) {
        const external = /^https?:\/\//i.test(href.trim());
        nodes.push(
          <a
            key={key}
            href={href}
            className={LINK_CLASS}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {linkText}
          </a>
        );
      } else {
        // Unsafe protocol: drop the link, keep the visible text only.
        nodes.push(linkText);
      }
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={key}>{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<em key={key}>{m[4]}</em>);
    } else if (m[5] !== undefined) {
      nodes.push(<em key={key}>{m[5]}</em>);
    }

    remaining = remaining.slice(m.index + m[0].length);
    i++;
  }

  return nodes;
}

/** Render a single block of lines (already split on blank lines). */
function renderBlock(block: string, key: string): React.ReactNode {
  const lines = block.split('\n').filter((l) => l.trim().length > 0);

  const isList =
    lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));

  if (isList) {
    return (
      <ul key={key} className="list-disc list-inside space-y-1">
        {lines.map((l, idx) => (
          <li key={`${key}-li-${idx}`}>
            {parseInline(l.replace(/^\s*[-*]\s+/, ''), `${key}-li-${idx}`)}
          </li>
        ))}
      </ul>
    );
  }

  // Paragraph: join lines with explicit <br/> breaks.
  const parts: React.ReactNode[] = [];
  lines.forEach((l, idx) => {
    if (idx > 0) parts.push(<br key={`${key}-br-${idx}`} />);
    parts.push(...parseInline(l, `${key}-p-${idx}`));
  });

  return <p key={key}>{parts}</p>;
}

interface ContentProps {
  content: ContentValue;
  /** When true, render markdown inline (no <p>/<ul> wrappers) — e.g. inside a label. */
  inline?: boolean;
  className?: string;
}

export default function Content({ content, inline = false, className }: ContentProps) {
  const { value, format } = content;

  if (format !== 'MARKDOWN') {
    // Plain text. React escapes the string, so this is inherently safe.
    return className ? <span className={className}>{value}</span> : <>{value}</>;
  }

  if (inline) {
    const nodes = parseInline(value.replace(/\n+/g, ' '), 'inline');
    return className ? <span className={className}>{nodes}</span> : <>{nodes}</>;
  }

  const blocks = value.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return (
    <div className={className}>
      {blocks.map((b, idx) => renderBlock(b, `blk-${idx}`))}
    </div>
  );
}
