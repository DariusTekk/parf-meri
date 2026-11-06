import '../admin.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { requireAdminPage } from '@/lib/server/request';
import { getSettings } from '@/lib/server/settings';

export const metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdminPage();
  const settings = await getSettings();
  return (
    <div className="admin-shell">
      <a href="#icerik" className="skip-link">
        İçeriğe atla
      </a>
      <aside className="admin-side">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link href="/admin" className="brand-mark">
            {settings.siteName}
          </Link>
          <Link href="/" target="_blank" className="btn btn-ghost btn-sm">
            Siteyi aç<span className="visually-hidden"> (yeni sekmede açılır)</span>
          </Link>
        </div>
        <AdminNav />
        <p className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
          {admin.email}
        </p>
        <LogoutButton />
      </aside>
      <main className="admin-main" id="icerik" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
