import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/admin');
  }
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border bg-white p-6 shadow">
      <h1 className="text-2xl font-semibold">Admin Login</h1>
      <form method="post" action="/api/auth/callback/credentials" className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </div>
        <button className="w-full rounded bg-slate-900 px-3 py-2 text-white">
          Sign in
        </button>
      </form>
    </div>
  );
}
