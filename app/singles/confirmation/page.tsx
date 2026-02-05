import Link from 'next/link';

export default function SinglesConfirmationPage({
  searchParams
}: {
  searchParams: { orderId?: string; subtotalCents?: string };
}) {
  const subtotalCents = Number(searchParams.subtotalCents ?? 0);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Order Received</h1>
      <p className="text-slate-700">
        Your singles order has been created. Provide payment to move it into production.
      </p>
      <div className="rounded border bg-white p-4">
        <p className="text-sm text-slate-600">Order ID</p>
        <p className="font-mono text-sm">{searchParams.orderId ?? 'Unknown'}</p>
        <p className="mt-2 text-sm text-slate-600">Subtotal</p>
        <p className="text-lg font-semibold">${(subtotalCents / 100).toFixed(2)}</p>
      </div>
      <Link href="/singles" className="text-sm text-blue-600">
        Place another singles order
      </Link>
    </section>
  );
}
