'use client';

export default function BatchActionsClient({
  batchId,
  status,
  notes
}: {
  batchId: string;
  status: string;
  notes: string;
}) {
  async function updateBatch(payload: { status?: string; notes?: string }) {
    await fetch(`/api/admin/batches/${batchId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    window.location.reload();
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm font-medium">Notes</label>
      <textarea
        className="w-full rounded border px-3 py-2 text-sm"
        rows={3}
        defaultValue={notes}
        onBlur={(event) => updateBatch({ notes: event.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateBatch({ status: 'PRINTED' })}
          className="rounded bg-slate-900 px-3 py-1 text-sm text-white"
        >
          Mark as Printed
        </button>
        {status !== 'ARCHIVED' ? (
          <button
            type="button"
            onClick={() => updateBatch({ status: 'ARCHIVED' })}
            className="rounded border px-3 py-1 text-sm"
          >
            Archive Batch
          </button>
        ) : (
          <button
            type="button"
            onClick={() => updateBatch({ status: 'GENERATED' })}
            className="rounded border px-3 py-1 text-sm"
          >
            Unarchive
          </button>
        )}
      </div>
    </div>
  );
}
