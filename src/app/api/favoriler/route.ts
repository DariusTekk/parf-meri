import type { NextRequest } from 'next/server';
import { apiOk, handle } from '@/lib/server/http';
import { publishedCardsBySlugs } from '@/lib/server/perfumes';
import { SLUG_PATTERN } from '@/lib/shared/text';

export const GET = handle(async (request: NextRequest) => {
  const raw = request.nextUrl.searchParams.get('slugs') ?? '';
  const slugs = [...new Set(raw.split(',').map((s) => s.trim()))]
    .filter((s) => s.length > 0 && s.length <= 80 && SLUG_PATTERN.test(s))
    .slice(0, 50);
  const items = await publishedCardsBySlugs(slugs);
  return apiOk({ items });
});
