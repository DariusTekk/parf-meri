import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { requireAdminPage } from '@/lib/server/request';
import { listBrands } from '@/lib/server/taxonomy';

export const metadata = { title: 'Markalar' };

export default async function BrandsPage() {
  await requireAdminPage();
  const items = await listBrands();
  return (
    <>
      <div className="admin-head">
        <h1>Markalar</h1>
      </div>
      <TaxonomyManager
        kind="marka"
        singular="Marka"
        items={items}
        withDescription
        publicPrefix="/marka/"
      />
    </>
  );
}
