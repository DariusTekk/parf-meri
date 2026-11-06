import Link from 'next/link';
import { Download, Plus } from 'lucide-react';
import { PerfumeTable } from '@/components/admin/PerfumeTable';
import { Pagination } from '@/components/ui/Pagination';
import { StateMessage } from '@/components/ui/StateMessage';
import { listForAdmin, type AdminListFilter } from '@/lib/server/perfumes';
import { requireAdminPage } from '@/lib/server/request';

export const metadata = { title: 'Parfümler' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const TABS: Array<{ key: NonNullable<AdminListFilter['durum']>; label: string }> = [
  { key: 'tumu', label: 'Tümü' },
  { key: 'yayinda', label: 'Yayında' },
  { key: 'taslak', label: 'Taslak' },
  { key: 'silinen', label: 'Silinenler' },
];

export default async function AdminPerfumesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 100) : '';
  const durumRaw = typeof sp.durum === 'string' ? sp.durum : 'tumu';
  const durum = (
    TABS.some((t) => t.key === durumRaw) ? durumRaw : 'tumu'
  ) as AdminListFilter['durum'];
  const sayfa = Math.max(1, Number(sp.sayfa) || 1);
  const result = await listForAdmin({ q, durum, sayfa });
  const href = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, durum, sayfa, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (
        v !== undefined &&
        v !== '' &&
        !(k === 'sayfa' && v === 1) &&
        !(k === 'durum' && v === 'tumu')
      )
        p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/admin/parfumler?${s}` : '/admin/parfumler';
  };

  return (
    <>
      <div className="admin-head">
        <h1>Parfümler</h1>
        <div className="row">
          <a href="/api/admin/disa-aktar" className="btn btn-secondary" download>
            <Download size={18} aria-hidden="true" />
            CSV indir
          </a>
          <Link href="/admin/parfumler/yeni" className="btn btn-primary">
            <Plus size={20} aria-hidden="true" />
            Yeni parfüm
          </Link>
        </div>
      </div>

      <nav aria-label="Durum filtresi">
        <ul className="tabs">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={href({ durum: t.key, sayfa: undefined })}
                aria-current={durum === t.key ? 'page' : undefined}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form method="get" action="/admin/parfumler" role="search" className="toolbar">
        {durum !== 'tumu' ? <input type="hidden" name="durum" value={durum} /> : null}
        <div className="field" style={{ flex: '1 1 240px' }}>
          <label className="field-label" htmlFor="admin-ara">
            Ara
          </label>
          <input
            id="admin-ara"
            name="q"
            type="search"
            className="input"
            defaultValue={q}
            placeholder="Ad, marka ya da nota"
          />
        </div>
        <button className="btn btn-secondary" type="submit">
          Ara
        </button>
      </form>

      <p role="status" className="muted">
        {result.total} kayıt
      </p>

      <PerfumeTable
        items={result.items}
        deletedView={durum === 'silinen'}
        empty={
          <StateMessage
            kind="empty"
            title={
              q || durum !== 'tumu' ? 'Bu ölçütlere uyan parfüm yok' : 'İlk parfümünüzü ekleyin'
            }
            action={
              <Link href="/admin/parfumler/yeni" className="btn btn-primary">
                Yeni parfüm
              </Link>
            }
          >
            {q || durum !== 'tumu'
              ? 'Aramayı ya da durum filtresini değiştirin.'
              : 'Eklediğiniz parfümler burada listelenir.'}
          </StateMessage>
        }
      />
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(p) => href({ sayfa: p })}
      />
    </>
  );
}
