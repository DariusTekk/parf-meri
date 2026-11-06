import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/server/env';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().siteUrl;
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
