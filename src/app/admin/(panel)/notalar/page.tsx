import { TaxonomyManager } from '@/components/admin/TaxonomyManager';
import { requireAdminPage } from '@/lib/server/request';
import { listNotes } from '@/lib/server/taxonomy';

export const metadata = { title: 'Notalar' };

export default async function NotesPage() {
  await requireAdminPage();
  const items = await listNotes();
  return (
    <>
      <div className="admin-head">
        <h1>Notalar</h1>
      </div>
      <p className="muted">
        Notalar parfüm formunda yazıldığında otomatik eklenir. Burada adlarını düzeltebilir ya da
        kullanılmayanları silebilirsiniz.
      </p>
      <TaxonomyManager kind="nota" singular="Nota" items={items} publicPrefix="/parfumler?nota=" />
    </>
  );
}
