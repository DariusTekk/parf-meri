import '../admin.css';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { currentAdmin } from '@/lib/server/request';
import { getSettings } from '@/lib/server/settings';

export const metadata = { title: 'Yönetici girişi', robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (await currentAdmin()) redirect('/admin');
  const reason = (await searchParams).neden;
  const settings = await getSettings();
  return (
    <main className="login-wrap" id="icerik">
      <div className="card login-card stack">
        <p className="muted" style={{ margin: 0 }}>
          {settings.siteName}
        </p>
        <h1 style={{ fontSize: 28 }}>Yönetici girişi</h1>
        <LoginForm sessionExpired={reason === 'oturum'} />
      </div>
    </main>
  );
}
