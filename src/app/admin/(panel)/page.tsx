import Link from 'next/link';
import { Plus } from 'lucide-react';
import { StateMessage } from '@/components/ui/StateMessage';
import { listAudit } from '@/lib/server/audit';
import { dashboardStats } from '@/lib/server/perfumes';
import { requireAdminPage } from '@/lib/server/request';
import { formatDateTime } from '@/lib/shared/format';

export const metadata = { title: 'Pano' };

export default async function DashboardPage() {
  await requireAdminPage();
  const [stats, recent] = await Promise.all([dashboardStats(), listAudit(8)]);
  const total = stats.published + stats.draft;
  return (
    <>
      <div className="admin-head">
        <h1>Pano</h1>
        <Link href="/admin/parfumler/yeni" className="btn btn-primary">
          <Plus size={20} aria-hidden="true" />
          Yeni parfüm
        </Link>
      </div>

      {total === 0 ? (
        <StateMessage
          kind="empty"
          title="Henüz parfüm eklemediniz"
          action={
            <Link href="/admin/parfumler/yeni" className="btn btn-primary">
              İlk parfümünüzü ekleyin
            </Link>
          }
        >
          Sırasıyla: marka ekleyin, parfümü taslak olarak kaydedin, görsel yükleyip alternatif
          metinlerini yazın, sonra yayınlayın. Site adı ve iletişim bilgileri için Site ayarları
          ekranını kullanın.
        </StateMessage>
      ) : null}

      <section aria-labelledby="sayilar" className="section-tight">
        <h2 id="sayilar" style={{ fontSize: 20 }}>
          Özet
        </h2>
        <div className="stat-grid">
          <Link className="stat" href="/admin/parfumler?durum=yayinda">
            <strong>{stats.published}</strong>Yayında
          </Link>
          <Link className="stat" href="/admin/parfumler?durum=taslak">
            <strong>{stats.draft}</strong>Taslak
          </Link>
          <Link className="stat" href="/admin/parfumler?durum=silinen">
            <strong>{stats.deleted}</strong>Silinen
          </Link>
          <Link className="stat" href="/admin/mesajlar">
            <strong>{stats.unread}</strong>Okunmamış mesaj
          </Link>
        </div>
      </section>

      {stats.missingAlt > 0 || stats.noImage > 0 ? (
        <StateMessage kind="warning" title="Yayın öncesi eksikler">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {stats.noImage > 0 ? <li>{stats.noImage} parfümün hiç görseli yok.</li> : null}
            {stats.missingAlt > 0 ? (
              <li>{stats.missingAlt} görselin alternatif metni boş.</li>
            ) : null}
          </ul>
        </StateMessage>
      ) : null}

      <section aria-labelledby="son-islemler" className="section-tight">
        <h2 id="son-islemler" style={{ fontSize: 20 }}>
          Son işlemler
        </h2>
        {recent.length === 0 ? (
          <p className="muted">Henüz işlem yok.</p>
        ) : (
          <ul className="stack" style={{ paddingLeft: 20 }}>
            {recent.map((r) => (
              <li key={r.id}>
                {r.summary} <span className="muted">· {formatDateTime(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/islem-gecmisi">Tüm işlem geçmişi</Link>
      </section>
    </>
  );
}
