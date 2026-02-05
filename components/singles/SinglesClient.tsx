'use client';

import { useMemo, useState } from 'react';
type PricingTier = {
  id: string;
  minSqIn: number;
  maxSqIn: number | null;
  ratePerSqIn: number;
  sortOrder: number;
};

import { computeBillableDimensions, selectTier } from '@/lib/pricing';

type Settings = {
  roundingIncrementIn: number;
  minWidthIn: number;
  minHeightIn: number;
  minBillableSqIn: number;
} | null;

type UploadItem = {
  id: string;
  file: File;
  widthIn: number;
  heightIn: number;
  qty: number;
};

export default function SinglesClient({
  settings,
  tiers
}: {
  settings: Settings;
  tiers: PricingTier[];
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pricingSettings = settings ?? {
    roundingIncrementIn: 0.25,
    minWidthIn: 2,
    minHeightIn: 2,
    minBillableSqIn: 4
  };

  const enriched = useMemo(() => {
    return items.map((item) => {
      const billable = computeBillableDimensions(
        item.widthIn,
        item.heightIn,
        pricingSettings
      );
      return { ...item, ...billable };
    });
  }, [items, pricingSettings]);

  const totalSqIn = enriched.reduce(
    (sum, item) => sum + item.billableSqIn * item.qty,
    0
  );
  const tier = tiers.length > 0 ? selectTier(totalSqIn, tiers) : null;
  const subtotal = tier ? totalSqIn * tier.ratePerSqIn : 0;

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      widthIn: 4,
      heightIn: 4,
      qty: 1
    }));
    setItems((prev) => [...prev, ...next]);
  }

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const formData = new FormData();
    items.forEach((item) => {
      formData.append('files', item.file, item.file.name);
    });
    formData.append(
      'payload',
      JSON.stringify(
        items.map((item) => ({
          id: item.id,
          widthIn: item.widthIn,
          heightIn: item.heightIn,
          qty: item.qty
        }))
      )
    );

    await fetch('/api/singles', {
      method: 'POST',
      body: formData
    });
    setSubmitting(false);
    setItems([]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-4">
        <label className="block text-sm font-medium">Upload PNGs</label>
        <input
          type="file"
          accept="image/png"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
          className="mt-2"
        />
      </div>
      <div className="space-y-4">
        {items.map((item) => {
          const billable = enriched.find((entry) => entry.id === item.id);
          return (
            <div key={item.id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.file.name}</p>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                  className="text-sm text-red-500"
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-medium">Width (in)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.widthIn}
                    onChange={(event) =>
                      updateItem(item.id, { widthIn: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Height (in)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.heightIn}
                    onChange={(event) =>
                      updateItem(item.id, { heightIn: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Qty</label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(event) =>
                      updateItem(item.id, { qty: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded border px-2 py-1"
                  />
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                Billable size: {billable?.billableWidthIn}" × {billable?.billableHeightIn}" ·
                {billable?.billableSqIn} sq in
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Pricing Summary</h2>
        <div className="mt-2 text-sm text-slate-700">
          <p>Total square inches: {totalSqIn.toFixed(2)}</p>
          {tier ? (
            <p>
              Tier rate: ${tier.ratePerSqIn.toFixed(2)} per sq in (min {tier.minSqIn}
              {tier.maxSqIn ? `- ${tier.maxSqIn}` : '+'})
            </p>
          ) : (
            <p>No pricing tiers configured.</p>
          )}
          <p className="font-semibold">Subtotal: ${subtotal.toFixed(2)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || items.length === 0}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:bg-slate-400"
      >
        {submitting ? 'Placing Order...' : 'Place Order'}
      </button>
    </div>
  );
}
