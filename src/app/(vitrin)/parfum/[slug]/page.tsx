import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { imageUrl } from '@/components/ui/Picture';
import { PerfumeDetailView } from '@/components/vitrin/PerfumeDetailView';
import { getEnv } from '@/lib/server/env';
import { getPublishedBySlug, similarPerfumes, type PerfumeDetail } from '@/lib/server/perfumes';
import { getSettings } from '@/lib/server/settings';
import { CONCENTRATION_LABELS } from '@/lib/shared/domain';
import { markdownToPlain } from '@/lib/shared/markdown';

type Params = Promise<{ slug: string }>;

const load = cache((slug: string) => getPublishedBySlug(slug));

function productJsonLd(p: PerfumeDetail, url: string, siteUrl: string) {
  const prices = p.variants.map((v) => v.priceKurus).filter((v): v is number => v !== null);
  const availability = {
    in_stock: 'https://schema.org/InStock',
    low: 'https://schema.org/LimitedAvailability',
    out: 'https://schema.org/OutOfStock',
    preorder: 'https://schema.org/PreOrder',
  }[p.stockStatus];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.brand.name} ${p.name}`,
    brand: { '@type': 'Brand', name: p.brand.name },
    description: markdownToPlain(p.descriptionMd, 500),
    image: p.images.map(
      (i) => `${siteUrl}${imageUrl(i.id, i.widths[i.widths.length - 1] ?? i.width)}`,
    ),
    category: CONCENTRATION_LABELS[p.concentration],
    url,
    ...(prices.length > 0
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'TRY',
            lowPrice: (Math.min(...prices) / 100).toFixed(2),
            highPrice: (Math.max(...prices) / 100).toFixed(2),
            offerCount: prices.length,
            availability,
          },
        }
      : {}),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const perfume = await load(slug);
  if (!perfume) return { title: 'Parfüm bulunamadı', robots: { index: false } };
  const title =
    perfume.seoTitle ??
    `${perfume.brand.name} ${perfume.name} ${CONCENTRATION_LABELS[perfume.concentration]}`;
  const description = perfume.seoDescription ?? markdownToPlain(perfume.descriptionMd);
  const cover = perfume.images[0];
  return {
    title,
    description,
    alternates: { canonical: `/parfum/${perfume.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/parfum/${perfume.slug}`,
      images: cover
        ? [
            {
              url: imageUrl(cover.id, cover.widths[cover.widths.length - 1] ?? cover.width),
              alt: cover.alt,
            },
          ]
        : undefined,
    },
  };
}

export default async function PerfumePage({ params }: { params: Params }) {
  const { slug } = await params;
  const perfume = await load(slug);
  if (!perfume) notFound();
  const [similar, settings, h] = await Promise.all([
    similarPerfumes(perfume),
    getSettings(),
    headers(),
  ]);
  const siteUrl = getEnv().siteUrl;
  const url = `${siteUrl}/parfum/${perfume.slug}`;
  const jsonLd = JSON.stringify(productJsonLd(perfume, url, siteUrl)).replace(/</g, '\\u003c');
  return (
    <>
      <script
        type="application/ld+json"
        nonce={h.get('x-nonce') ?? undefined}
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <PerfumeDetailView
        perfume={perfume}
        similar={similar}
        whatsapp={settings.whatsapp}
        pageUrl={url}
      />
    </>
  );
}
