import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImageManager } from '@/components/admin/ImageManager';
import { PerfumeForm } from '@/components/admin/PerfumeForm';
import { StateMessage } from '@/components/ui/StateMessage';
import { listImages } from '@/lib/server/images';
import { getPerfumeForAdmin } from '@/lib/server/perfumes';
import { requireAdminPage } from '@/lib/server/request';
import { listBrands, listFamilies, listNotes } from '@/lib/server/taxonomy';
import { STATUS_LABELS } from '@/lib/shared/domain';

export const metadata = { title: 'Parfümü düzenle' };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditPerfumePage({ params, searchParams }: Props) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const perfume = await getPerfumeForAdmin(id);
  if (!perfume) notFound();
  const created = (await searchParams).olusturuldu === '1';
  const [brands, families, notes, images] = await Promise.all([
    listBrands(),
    listFamilies(),
    listNotes(),
    listImages(id),
  ]);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{perfume.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {perfume.deletedAt ? 'Silinmiş (vitrinde görünmez)' : STATUS_LABELS[perfume.status]}
          </p>
        </div>
        <Link href="/admin/parfumler" className="btn btn-ghost">
          Listeye dön
        </Link>
      </div>
      {created ? (
        <div style={{ marginBottom: 24 }}>
          <StateMessage kind="success" title="Taslak oluşturuldu" live>
            Şimdi görsel ekleyip alternatif metinlerini yazın, ardından durumu &quot;Yayında&quot;
            yapıp kaydedin.
          </StateMessage>
        </div>
      ) : null}
      {perfume.deletedAt ? (
        <div style={{ marginBottom: 24 }}>
          <StateMessage kind="warning" title="Bu parfüm silinmiş">
            Parfümler listesindeki Silinenler sekmesinden geri alabilirsiniz.
          </StateMessage>
        </div>
      ) : null}
      <div className="stack">
        <ImageManager perfumeId={perfume.id} initialImages={images} />
        <PerfumeForm
          perfume={perfume}
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
          families={families.map((f) => ({ id: f.id, name: f.name }))}
          noteNames={notes.map((n) => n.name)}
          imageCount={images.length}
        />
      </div>
    </>
  );
}
