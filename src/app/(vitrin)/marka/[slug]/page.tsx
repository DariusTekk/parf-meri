import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { StateMessage } from '@/components/ui/StateMessage';
import { PerfumeGrid } from '@/components/vitrin/PerfumeCardView';
import { brandWithPublished } from '@/lib/server/perfumes';
import { markdownToPlain, renderMarkdown } from '@/lib/shared/markdown';
import { t } from '@/i18n/tr';

type Params = Promise<{ slug: string }>;
const load = cache((slug: string) => brandWithPublished(slug));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return { title: 'Marka bulunamadı', robots: { index: false } };
  return {
    title: `${data.brand.name} parfümleri`,
    description: data.brand.description
      ? markdownToPlain(data.brand.description)
      : `${data.brand.name} markasının koleksiyonumuzdaki parfümleri.`,
    alternates: { canonical: `/marka/${data.brand.slug}` },
    robots: data.perfumes.length === 0 ? { index: false } : undefined,
  };
}

export default async function BrandPage({ params }: { params: Params }) {
  const data = await load((await params).slug);
  if (!data) notFound();
  return (
    <div className="container section-tight">
      <nav aria-label="Konum" className="breadcrumbs">
        <ol>
          <li>
            <Link href="/">{t.common.home}</Link>
          </li>
          <li>
            <Link href="/parfumler">{t.nav.catalog}</Link>
          </li>
          <li aria-current="page">{data.brand.name}</li>
        </ol>
      </nav>
      <h1>{data.brand.name}</h1>
      {data.brand.description ? (
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(data.brand.description, 2) }}
        />
      ) : null}
      <div style={{ height: 24 }} />
      {data.perfumes.length === 0 ? (
        <StateMessage kind="empty" title="Bu markanın şu anda yayında parfümü yok">
          Diğer markalara göz atabilirsiniz.
        </StateMessage>
      ) : (
        <PerfumeGrid
          items={data.perfumes}
          priorityCount={2}
          headingLevel={2}
          label={`${data.brand.name} parfümleri`}
        />
      )}
    </div>
  );
}
