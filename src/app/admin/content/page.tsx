'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';

type ContentFormat = 'TEXT' | 'MARKDOWN';

interface ContentBlock {
  id: string;
  key: string;
  page: string;
  label: string;
  value: string;
  format: ContentFormat;
  updatedBy: string | null;
  updatedAt: string;
}

// Friendly, ordered names for each page group.
const PAGE_META: Record<string, { title: string; order: number; description: string }> = {
  register_landing: {
    title: 'Event Selection Page',
    order: 1,
    description: 'The page where players choose which event to register for.',
  },
  register_form: {
    title: 'Registration Form',
    order: 2,
    description: 'Headings, questions, division descriptions, and acknowledgment checkboxes.',
  },
  register_payment: {
    title: 'Payment Page',
    order: 3,
    description: 'Payment notice and refund policy shown during checkout.',
  },
};

function pageTitle(page: string): string {
  return PAGE_META[page]?.title ?? page;
}

export default function ContentPage() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Local working copy of edits, keyed by block id.
  const [drafts, setDrafts] = useState<Record<string, { value: string; format: ContentFormat }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/content');
      if (!res.ok) throw new Error('Failed to fetch content');
      const data = (await res.json()) as ContentBlock[];
      setBlocks(data);
      const initial: Record<string, { value: string; format: ContentFormat }> = {};
      for (const b of data) initial[b.id] = { value: b.value, format: b.format };
      setDrafts(initial);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = (b: ContentBlock): boolean => {
    const d = drafts[b.id];
    return !!d && (d.value !== b.value || d.format !== b.format);
  };

  const handleSave = async (b: ContentBlock) => {
    const draft = drafts[b.id];
    if (!draft) return;
    setSavingId(b.id);
    try {
      const res = await fetch(`/api/admin/content/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      const updated = (await res.json()) as ContentBlock;
      setBlocks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success(`Saved “${b.label}”`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  // Group blocks by page, in the defined order.
  const groups = Object.entries(
    blocks.reduce<Record<string, ContentBlock[]>>((acc, b) => {
      (acc[b.page] ||= []).push(b);
      return acc;
    }, {})
  ).sort(([a], [b]) => (PAGE_META[a]?.order ?? 99) - (PAGE_META[b]?.order ?? 99));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Content</h1>
        <p className="text-gray-600">
          Edit the text shown on the registration pages. Changes go live immediately.
          Choose <span className="font-medium">Markdown</span> to use links, <strong>bold</strong>,
          and lists; otherwise text is shown exactly as typed.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : blocks.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            No content blocks found. Run the database seed to create them.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([page, pageBlocks]) => (
            <section key={page}>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">{pageTitle(page)}</h2>
                {PAGE_META[page]?.description && (
                  <p className="text-sm text-gray-500">{PAGE_META[page].description}</p>
                )}
              </div>

              <div className="space-y-4">
                {pageBlocks.map((b) => {
                  const draft = drafts[b.id] ?? { value: b.value, format: b.format };
                  const dirty = isDirty(b);
                  const saving = savingId === b.id;
                  return (
                    <div key={b.id} className="card p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <label
                            htmlFor={`block-${b.id}`}
                            className="block font-medium text-gray-900"
                          >
                            {b.label}
                          </label>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{b.key}</p>
                        </div>
                        <select
                          aria-label="Content format"
                          value={draft.format}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [b.id]: { ...draft, format: e.target.value as ContentFormat },
                            }))
                          }
                          className="input !w-auto !py-1 text-sm"
                        >
                          <option value="TEXT">Plain text</option>
                          <option value="MARKDOWN">Markdown</option>
                        </select>
                      </div>

                      <textarea
                        id={`block-${b.id}`}
                        value={draft.value}
                        rows={Math.min(8, Math.max(2, draft.value.split('\n').length + 1))}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [b.id]: { ...draft, value: e.target.value },
                          }))
                        }
                        className="input font-normal"
                        placeholder="(empty — nothing will be shown)"
                      />

                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-400">
                          {b.updatedBy
                            ? `Last edited by ${b.updatedBy}`
                            : 'Not yet edited'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSave(b)}
                          disabled={!dirty || saving}
                          className="btn btn-primary gap-2 !py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {dirty ? 'Save' : 'Saved'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
