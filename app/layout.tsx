import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'DTF Gang Sheet Builder',
  description: 'Standalone DTF gang sheet + singles + library platform'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold">
              DTF Gang Sheet
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/builder">Builder</Link>
              <Link href="/singles">Singles</Link>
              <Link href="/library">Library</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
