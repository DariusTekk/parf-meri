import sharp from 'sharp';
import { getDb } from '@/lib/server/db';
import { migrateToLatest } from '@/lib/server/db/migrate';
import { addImage } from '@/lib/server/images';
import { savePerfume } from '@/lib/server/perfumes';
import { createTaxonomy } from '@/lib/server/taxonomy';
import type { PerfumeInput } from '@/lib/shared/schemas';

export async function freshDb() {
  await migrateToLatest();
  const db = getDb();
  for (const t of [
    'perfume_images',
    'perfume_notes',
    'perfume_variants',
    'contact_messages',
    'perfumes',
    'brands',
    'notes',
    'sessions',
    'rate_events',
    'audit_log',
    'admins',
    'site_settings',
  ] as const) {
    await db.deleteFrom(t).execute();
  }
}

let brandCounter = 0;
export async function makeBrand(name = `Marka ${++brandCounter}`) {
  return createTaxonomy('brand', name);
}

export function perfumeInput(overrides: Partial<PerfumeInput> = {}): PerfumeInput {
  return {
    name: 'Deneme Parfüm',
    slug: '',
    brandId: 1,
    familyId: null,
    description: 'Deneme için yazılmış açıklama metni.',
    concentration: 'EDP',
    gender: null,
    stockStatus: 'in_stock',
    status: 'draft',
    isFeatured: false,
    allergens: null,
    seoTitle: null,
    seoDescription: null,
    notes: { top: [], heart: [], base: [] },
    variants: [],
    ...overrides,
  };
}

export async function pngBuffer(width = 600, height = 750, color = '#c08040') {
  return sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer();
}

/** Görselli ve yayında bir parfüm oluşturur. */
export async function publishedPerfume(brandId: number, overrides: Partial<PerfumeInput> = {}) {
  const draft = await savePerfume(perfumeInput({ brandId, ...overrides, status: 'draft' }));
  await addImage(draft.id, await pngBuffer(), 'image/png', 'Örnek şişe');
  const pub = await savePerfume(
    perfumeInput({ brandId, ...overrides, slug: draft.slug, status: 'published' }),
    {
      id: draft.id,
    },
  );
  return pub;
}
