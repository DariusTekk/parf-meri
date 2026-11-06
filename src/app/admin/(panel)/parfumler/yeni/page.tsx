import Link from 'next/link';
import { PerfumeForm } from '@/components/admin/PerfumeForm';
import { StateMessage } from '@/components/ui/StateMessage';
import { requireAdminPage } from '@/lib/server/request';
import { listBrands, listFamilies, listNotes } from '@/lib/server/taxonomy';

export const metadata = { title: 'Yeni parfüm' };

export default async function NewPerfumePage() {
  await requireAdminPage();
  const [brands, families, notes] = await Promise.all([listBrands(), listFamilies(), listNotes()]);
  return (
    <>
      <div className="admin-head">
        <h1>Yeni parfüm</h1>
        <Link href="/admin/parfumler" className="btn btn-ghost">
          Listeye dön
        </Link>
      </div>
      {brands.length === 0 ? (
        <div style={{ marginBottom: 24 }}>
          <StateMessage
            kind="warning"
            title="Önce marka ekleyin"
            action={
              <Link href="/admin/markalar" className="btn btn-primary">
                Markalar
              </Link>
            }
          >
            Her parfüm bir markaya bağlıdır.
          </StateMessage>
        </div>
      ) : null}
      <p className="muted">
        Parfümü önce taslak olarak oluşturun; ardından açılan sayfada görselleri yükleyip
        yayınlayabilirsiniz.
      </p>
      <PerfumeForm
        perfume={null}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        families={families.map((f) => ({ id: f.id, name: f.name }))}
        noteNames={notes.map((n) => n.name)}
        imageCount={0}
      />
    </>
  );
}
