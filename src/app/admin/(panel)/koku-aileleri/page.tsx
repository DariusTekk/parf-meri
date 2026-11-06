import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { requireAdminPage } from '@/lib/server/request';
import { listFamilies } from '@/lib/server/taxonomy';

export const metadata = { title: 'Koku aileleri' };

export default async function FamiliesPage() {
  await requireAdminPage();
  const items = await listFamilies();
  return (
    <>
      <div className="admin-head">
        <h1>Koku aileleri</h1>
      </div>
      <p className="muted">
        Katalog filtresinde ve ana sayfadaki &quot;Koku ailesine göre keşfedin&quot; bölümünde
        kullanılır.
      </p>
      <TaxonomyManager
        kind="koku-ailesi"
        singular="Koku ailesi"
        items={items}
        publicPrefix="/parfumler?aile="
      />
    </>
  );
}
