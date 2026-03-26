'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClearTestDataButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClear = async () => {
    const confirmed = confirm(
      'This will permanently delete ALL registrations. This cannot be undone.\n\nAre you sure?'
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/clear-test-data', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear data');

      const { deleted } = await response.json();
      toast.success(`Cleared ${deleted} registration${deleted !== 1 ? 's' : ''}`);
      router.refresh();
    } catch (error) {
      toast.error('Failed to clear data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClear}
      disabled={isLoading}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
      Clear Test Data
    </button>
  );
}
