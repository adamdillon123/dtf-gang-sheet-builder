'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';

const tierSchema = z.object({
  id: z.string().optional(),
  minSqIn: z.number().min(0),
  maxSqIn: z.number().nullable(),
  ratePerSqIn: z.number().positive(),
  sortOrder: z.number().int().min(1)
});

const settingsSchema = z.object({
  roundingIncrementIn: z.number().positive(),
  minWidthIn: z.number().positive(),
  minHeightIn: z.number().positive(),
  minBillableSqIn: z.number().positive()
});

const payloadSchema = z.object({
  settings: settingsSchema,
  tiers: z.array(tierSchema)
});

export type PricingSettingsData = z.infer<typeof settingsSchema>;
export type PricingTierData = z.infer<typeof tierSchema>;

function validateTierRanges(tiers: PricingTierData[]) {
  if (tiers.length === 0) {
    return 'Add at least one pricing tier.';
  }
  const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const tier of sorted) {
    if (tier.maxSqIn !== null && tier.minSqIn >= tier.maxSqIn) {
      return 'Each tier must have minSqIn < maxSqIn.';
    }
  }
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.maxSqIn === null) {
      return 'Only the last tier can have an open-ended max.';
    }
    if (next.minSqIn !== current.maxSqIn + 1) {
      return 'Tiers must be contiguous with no gaps or overlaps (e.g. 0-100, 101-300).';
    }
  }
  return null;
}

export default function PricingSettingsClient({
  initialSettings,
  initialTiers
}: {
  initialSettings: PricingSettingsData;
  initialTiers: PricingTierData[];
}) {
  const [settings, setSettings] = useState<PricingSettingsData>(initialSettings);
  const [tiers, setTiers] = useState<PricingTierData[]>(initialTiers);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.sortOrder - b.sortOrder),
    [tiers]
  );

  function updateTier(index: number, patch: Partial<PricingTierData>) {
    setTiers((prev) =>
      prev.map((tier, idx) =>
        idx === index ? { ...tier, ...patch } : tier
      )
    );
  }

  function handleAddTier() {
    const nextSortOrder = tiers.length + 1;
    setTiers((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        minSqIn: 0,
        maxSqIn: null,
        ratePerSqIn: 0.1,
        sortOrder: nextSortOrder
      }
    ]);
  }

  function handleRemoveTier(index: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== index));
  }

  function moveTier(index: number, direction: -1 | 1) {
    setTiers((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next.map((tier, idx) => ({ ...tier, sortOrder: idx + 1 }));
    });
  }

  async function handleSave() {
    setStatus(null);
    const parsed = payloadSchema.safeParse({ settings, tiers: sortedTiers });
    if (!parsed.success) {
      setStatus({ type: 'error', message: 'Please fix validation errors.' });
      return;
    }
    const rangeError = validateTierRanges(sortedTiers);
    if (rangeError) {
      setStatus({ type: 'error', message: rangeError });
      return;
    }

    setSaving(true);
    const response = await fetch('/api/admin/pricing-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Save failed.' }));
      setStatus({ type: 'error', message: error.error ?? 'Save failed.' });
      setSaving(false);
      return;
    }
    setStatus({ type: 'success', message: 'Pricing settings saved.' });
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Pricing Settings</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Rounding Increment (in)</label>
            <input
              type="number"
              step="0.01"
              value={settings.roundingIncrementIn}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  roundingIncrementIn: Number(event.target.value)
                })
              }
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Min Width (in)</label>
            <input
              type="number"
              step="0.01"
              value={settings.minWidthIn}
              onChange={(event) =>
                setSettings({ ...settings, minWidthIn: Number(event.target.value) })
              }
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Min Height (in)</label>
            <input
              type="number"
              step="0.01"
              value={settings.minHeightIn}
              onChange={(event) =>
                setSettings({ ...settings, minHeightIn: Number(event.target.value) })
              }
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Min Billable Sq In</label>
            <input
              type="number"
              step="0.01"
              value={settings.minBillableSqIn}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minBillableSqIn: Number(event.target.value)
                })
              }
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pricing Tiers</h2>
          <button
            type="button"
            onClick={handleAddTier}
            className="rounded border px-3 py-1 text-sm"
          >
            Add Tier
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {sortedTiers.map((tier, index) => (
            <div key={tier.id ?? index} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <input
                type="number"
                step="1"
                value={tier.minSqIn}
                onChange={(event) =>
                  updateTier(index, { minSqIn: Number(event.target.value) })
                }
                className="rounded border px-2 py-1"
              />
              <input
                type="number"
                step="1"
                value={tier.maxSqIn ?? ''}
                placeholder="Infinity"
                onChange={(event) =>
                  updateTier(index, {
                    maxSqIn: event.target.value === '' ? null : Number(event.target.value)
                  })
                }
                className="rounded border px-2 py-1"
              />
              <input
                type="number"
                step="0.01"
                value={tier.ratePerSqIn}
                onChange={(event) =>
                  updateTier(index, { ratePerSqIn: Number(event.target.value) })
                }
                className="rounded border px-2 py-1"
              />
              <input
                type="number"
                step="1"
                value={tier.sortOrder}
                onChange={(event) =>
                  updateTier(index, { sortOrder: Number(event.target.value) })
                }
                className="rounded border px-2 py-1"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveTier(index, -1)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveTier(index, 1)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTier(index)}
                  className="rounded border px-2 py-1 text-xs text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {status && (
        <div
          className={
            status.type === 'success'
              ? 'rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700'
              : 'rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700'
          }
        >
          {status.message}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:bg-slate-400"
      >
        {saving ? 'Saving...' : 'Save Pricing Settings'}
      </button>
    </div>
  );
}
