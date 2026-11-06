import '../../../../../(vitrin)/vitrin.css';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PerfumeDetailView } from '@/components/vitrin/PerfumeDetailView';
import { getEnv } from '@/lib/server/env';
import { getPerfumeForAdmin, similarPerfumes } from '@/lib/server/perfumes';
import { requireAdminPage } from '@/lib/server/request';
import { getSettings } from '@/lib/server/settings';
import { STATUS_LABELS } from '@/lib/shared/domain';

export const metadata = { title: 'Önizleme' };

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const perfume = await getPerfumeForAdmin(id);
  if (!perfume) notFound();
  const [similar, settings] = await Promise.all([similarPerfumes(perfume), getSettings()]);
  return (
    <>
      <div className="preview-banner" role="note">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>
            Önizleme: vitrinde böyle görünür. Durum:{' '}
            {perfume.deletedAt ? 'Silinmiş' : STATUS_LABELS[perfume.status]}
          </span>
          <Link href={`/admin/parfumler/${perfume.id}`} className="btn btn-secondary btn-sm">
            Düzenlemeye dön
          </Link>
        </div>
      </div>
      <PerfumeDetailView
        perfume={perfume}
        similar={similar}
        whatsapp={settings.whatsapp}
        pageUrl={`${getEnv().siteUrl}/parfum/${perfume.slug}`}
      />
    </>
  );
}
