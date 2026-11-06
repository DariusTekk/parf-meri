import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/server/env';
import { brandsForSitemap, publishedForSitemap } from '@/lib/server/perfumes';

export const dynamic = 'force-dynamic';

/** Yalnızca yayındaki parfümler ve en az bir yayında parfümü olan markalar. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().siteUrl;
  const [perfumes, brands] = await Promise.all([publishedForSitemap(), brandsForSitemap()]);
  const statics = [
    '',
    '/parfumler',
    '/hakkimizda',
    '/iletisim',
    '/kvkk-aydinlatma',
    '/gizlilik-ve-cerezler',
  ];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: 'weekly' as const })),
    ...brands.map((b) => ({ url: `${base}/marka/${b.slug}`, lastModified: b.updated_at })),
    ...perfumes.map((p) => ({ url: `${base}/parfum/${p.slug}`, lastModified: p.updated_at })),
  ];
}
