'use client';

import { useMemo, useState } from 'react';

export type QueueItem = {
  id: string;
  orderId: string;
  previewUrl: string | null;
  filename: string;
  requestedWidthIn: number;
  requestedHeightIn: number;
  qty: number;
};

export default function QueueClient({ items }: { items: QueueItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalRemaining = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items]
  );

  const selectedCount = useMemo(() => {
    if (selectAll) {
      return totalRemaining;
    }
    return items
      .filter((item) => selected.has(item.id))
      .reduce((sum, item) => sum + item.qty, 0);
  }, [items, selected, selectAll, totalRemaining]);

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleGenerate() {
    setStatus(null);
    setSubmitting(true);
    const body = {
      orderItemIds: selectAll ? [] : Array.from(selected)
    };
    const response = await fetch('/api/admin/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Batch failed.' }));
      setStatus(error.error ?? 'Batch failed.');
      setSubmitting(false);
      return;
    }
    const result = await response.json();
    window.location.href = result.redirectUrl ?? '/admin/batches';
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-600">
          Total items remaining: <span className="font-semibold">{totalRemaining}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={() => {
                setSelectAll((prev) => !prev);
                setSelected(new Set());
              }}
            />
            Select all
          </label>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={submitting || selectedCount === 0}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:bg-slate-400"
          >
            {submitting ? 'Generating...' : `Generate Batch Sheet (${selectedCount})`}
          </button>
        </div>
      </div>
      {status && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {status}
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded border bg-white p-4">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectAll || selected.has(item.id)}
                onChange={() => {
                  if (selectAll) {
                    setSelectAll(false);
                  }
                  toggleItem(item.id);
                }}
              />
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt={item.filename} className="h-16 w-16 rounded border object-contain" />
              ) : (
                <div className="h-16 w-16 rounded border bg-slate-100" />
              )}
              <div>
                <p className="text-sm font-medium">Order {item.orderId}</p>
                <p className="text-xs text-slate-600">
                  {item.requestedWidthIn}" × {item.requestedHeightIn}" · Qty {item.qty}
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500">{item.filename}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
