import { type ExpressionBuilder, type SelectQueryBuilder, sql } from 'kysely';
import { getDb } from './db';
import type { Database } from './db/types';
import { HttpError } from './http';
import { resolveNoteIds, uniqueSlug } from './taxonomy';
import {
  ADMIN_PAGE_SIZE,
  CATALOG_PAGE_SIZE,
  NOTE_TIERS,
  type Concentration,
  type NoteTier,
  type PerfumeStatus,
  type StockStatus,
} from '@/lib/shared/domain';
import { nowIso } from '@/lib/shared/format';
import type { CatalogQuery, PerfumeInput } from '@/lib/shared/schemas';
import { escapeLike, foldTr, searchTokens } from '@/lib/shared/text';

import type { ImageInfo, PerfumeCard } from '@/lib/shared/types';

export type { ImageInfo, PerfumeCard };

type DB = Database;
type PerfumeQB = SelectQueryBuilder<DB, 'perfumes' | 'brands', object>;

function parseCover(json: string | null): ImageInfo | null {
  if (!json) return null;
  const raw = JSON.parse(json) as { id: string; alt: string; w: number; h: number; ws: string };
  return { id: raw.id, alt: raw.alt, width: raw.w, height: raw.h, widths: parseWidths(raw.ws) };
}

export function parseWidths(value: string): number[] {
  return value
    .split(',')
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
}

const coverSubquery = sql<string | null>`(
  SELECT json_object('id', pi.id, 'alt', pi.alt_text, 'w', pi.width, 'h', pi.height, 'ws', pi.widths)
  FROM perfume_images pi WHERE pi.perfume_id = perfumes.id
  ORDER BY pi.is_cover DESC, pi.sort_order ASC LIMIT 1
)`;

function cardSelect(qb: PerfumeQB) {
  return qb.select([
    'perfumes.id',
    'perfumes.slug',
    'perfumes.name',
    'perfumes.concentration',
    'perfumes.stock_status',
    'perfumes.min_price_kurus',
    'brands.name as brand_name',
    'brands.slug as brand_slug',
    coverSubquery.as('cover_json'),
  ]);
}

type CardRow = {
  id: number;
  slug: string;
  name: string;
  concentration: Concentration;
  stock_status: StockStatus;
  min_price_kurus: number | null;
  brand_name: string;
  brand_slug: string;
  cover_json: string | null;
};

function toCard(row: CardRow): PerfumeCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandName: row.brand_name,
    brandSlug: row.brand_slug,
    concentration: row.concentration,
    stockStatus: row.stock_status,
    minPriceKurus: row.min_price_kurus,
    cover: parseCover(row.cover_json),
  };
}

/** Ziyaretçiye görünen tek kaynak: yayında ve silinmemiş parfümler. */
export function publicPerfumes() {
  return getDb()
    .selectFrom('perfumes')
    .innerJoin('brands', 'brands.id', 'perfumes.brand_id')
    .where('perfumes.status', '=', 'published')
    .where('perfumes.deleted_at', 'is', null);
}

function applySearch<QB extends SelectQueryBuilder<DB, 'perfumes', object>>(
  qb: QB,
  q?: string,
): QB {
  let out = qb;
  for (const token of searchTokens(q ?? '')) {
    out = out.where(
      sql<boolean>`perfumes.search_text LIKE ${`%${escapeLike(token)}%`} ESCAPE '\\'`,
    ) as QB;
  }
  return out;
}

export type CatalogResult = {
  items: PerfumeCard[];
  total: number;
  page: number;
  pageCount: number;
};

export async function listPublished(query: CatalogQuery): Promise<CatalogResult> {
  let qb = publicPerfumes();
  qb = applySearch(qb, query.q);
  if (query.marka) qb = qb.where('brands.slug', '=', query.marka);
  if (query.aile) {
    const aile = query.aile;
    qb = qb.where((eb) =>
      eb.exists(
        eb
          .selectFrom('fragrance_families as ff')
          .select(sql`1`.as('x'))
          .whereRef('ff.id', '=', 'perfumes.family_id')
          .where('ff.slug', '=', aile),
      ),
    );
  }
  if (query.nota) {
    const nota = query.nota;
    qb = qb.where((eb) =>
      eb.exists(
        eb
          .selectFrom('perfume_notes as pn')
          .innerJoin('notes as n', 'n.id', 'pn.note_id')
          .select(sql`1`.as('x'))
          .whereRef('pn.perfume_id', '=', 'perfumes.id')
          .where('n.slug', '=', nota),
      ),
    );
  }
  if (query.konsantrasyon) qb = qb.where('perfumes.concentration', '=', query.konsantrasyon);
  if (query.min !== undefined) qb = qb.where('perfumes.min_price_kurus', '>=', query.min * 100);
  if (query.max !== undefined) qb = qb.where('perfumes.min_price_kurus', '<=', query.max * 100);

  const countRow = await qb
    .select((eb) => eb.fn.countAll<number>().as('n'))
    .executeTakeFirstOrThrow();
  const total = Number(countRow.n);
  const pageCount = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(query.sayfa ?? 1, pageCount);

  let listQb = cardSelect(qb);
  switch (query.sirala) {
    case 'fiyat-artan':
      listQb = listQb
        .orderBy(sql`perfumes.min_price_kurus IS NULL`)
        .orderBy('perfumes.min_price_kurus', 'asc');
      break;
    case 'fiyat-azalan':
      listQb = listQb
        .orderBy(sql`perfumes.min_price_kurus IS NULL`)
        .orderBy('perfumes.min_price_kurus', 'desc');
      break;
    case 'ad':
      listQb = listQb.orderBy('perfumes.sort_name', 'asc');
      break;
    default:
      listQb = listQb.orderBy('perfumes.published_at', 'desc');
  }
  const rows = await listQb
    .orderBy('perfumes.id', 'desc')
    .limit(CATALOG_PAGE_SIZE)
    .offset((page - 1) * CATALOG_PAGE_SIZE)
    .execute();
  return { items: rows.map(toCard), total, page, pageCount };
}

export type Facet = { kind: 'brand' | 'family' | 'note'; slug: string; name: string };

/** Filtre seçenekleri; yalnızca yayındaki parfümlerde kullanılanlar, tek sorguda. */
export async function catalogFacets(): Promise<Record<Facet['kind'], Facet[]>> {
  const rows = await sql<Facet>`
    SELECT 'brand' AS kind, b.slug, b.name FROM brands b
      WHERE EXISTS (SELECT 1 FROM perfumes p WHERE p.brand_id = b.id AND p.status = 'published' AND p.deleted_at IS NULL)
    UNION ALL
    SELECT 'family' AS kind, f.slug, f.name FROM fragrance_families f
      WHERE EXISTS (SELECT 1 FROM perfumes p WHERE p.family_id = f.id AND p.status = 'published' AND p.deleted_at IS NULL)
    UNION ALL
    SELECT 'note' AS kind, n.slug, n.name FROM notes n
      WHERE EXISTS (SELECT 1 FROM perfume_notes pn JOIN perfumes p ON p.id = pn.perfume_id
        WHERE pn.note_id = n.id AND p.status = 'published' AND p.deleted_at IS NULL)
  `.execute(getDb());
  const out: Record<Facet['kind'], Facet[]> = { brand: [], family: [], note: [] };
  for (const row of rows.rows) out[row.kind].push(row);
  const collator = new Intl.Collator('tr-TR');
  for (const key of Object.keys(out) as Facet['kind'][])
    out[key].sort((a, b) => collator.compare(a.name, b.name));
  return out;
}

export async function featuredPerfumes(limit = 8): Promise<PerfumeCard[]> {
  const rows = await cardSelect(publicPerfumes().where('perfumes.is_featured', '=', 1))
    .orderBy('perfumes.published_at', 'desc')
    .limit(limit)
    .execute();
  return rows.map(toCard);
}

export async function newestPerfumes(limit = 8): Promise<PerfumeCard[]> {
  const rows = await cardSelect(publicPerfumes())
    .orderBy('perfumes.published_at', 'desc')
    .orderBy('perfumes.id', 'desc')
    .limit(limit)
    .execute();
  return rows.map(toCard);
}

export async function publishedCardsBySlugs(slugs: string[]): Promise<PerfumeCard[]> {
  if (slugs.length === 0) return [];
  const rows = await cardSelect(publicPerfumes().where('perfumes.slug', 'in', slugs)).execute();
  const order = new Map(slugs.map((s, i) => [s, i]));
  return rows.map(toCard).sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export type PerfumeDetail = {
  id: number;
  slug: string;
  name: string;
  status: PerfumeStatus;
  deletedAt: string | null;
  descriptionMd: string;
  concentration: Concentration;
  gender: PerfumeInput['gender'];
  stockStatus: StockStatus;
  isFeatured: boolean;
  allergens: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brand: { id: number; name: string; slug: string };
  family: { id: number; name: string; slug: string } | null;
  notes: Record<NoteTier, Array<{ id: number; name: string; slug: string }>>;
  variants: Array<{ volumeMl: number; priceKurus: number | null }>;
  images: ImageInfo[];
  minPriceKurus: number | null;
};

async function loadDetail(
  where: (
    eb: ExpressionBuilder<DB, 'perfumes'>,
  ) => ReturnType<ExpressionBuilder<DB, 'perfumes'>['and']>,
  publicOnly: boolean,
): Promise<PerfumeDetail | null> {
  const db = getDb();
  let qb = db
    .selectFrom('perfumes')
    .innerJoin('brands', 'brands.id', 'perfumes.brand_id')
    .leftJoin('fragrance_families as ff', 'ff.id', 'perfumes.family_id')
    .selectAll('perfumes')
    .select([
      'brands.name as brand_name',
      'brands.slug as brand_slug',
      'ff.name as family_name',
      'ff.slug as family_slug',
    ])
    .where(where);
  if (publicOnly) {
    qb = qb.where('perfumes.status', '=', 'published').where('perfumes.deleted_at', 'is', null);
  }
  const p = await qb.executeTakeFirst();
  if (!p) return null;

  const [notes, variants, images] = await Promise.all([
    db
      .selectFrom('perfume_notes')
      .innerJoin('notes', 'notes.id', 'perfume_notes.note_id')
      .select(['notes.id', 'notes.name', 'notes.slug', 'perfume_notes.tier'])
      .where('perfume_notes.perfume_id', '=', p.id)
      .orderBy('notes.name')
      .execute(),
    db
      .selectFrom('perfume_variants')
      .select(['volume_ml', 'price_kurus'])
      .where('perfume_id', '=', p.id)
      .orderBy('sort_order')
      .execute(),
    db
      .selectFrom('perfume_images')
      .select(['id', 'alt_text', 'width', 'height', 'widths', 'is_cover', 'sort_order'])
      .where('perfume_id', '=', p.id)
      .orderBy('is_cover', 'desc')
      .orderBy('sort_order')
      .execute(),
  ]);

  const tiers = Object.fromEntries(
    NOTE_TIERS.map((t) => [t, [] as PerfumeDetail['notes'][NoteTier]]),
  ) as PerfumeDetail['notes'];
  for (const n of notes) tiers[n.tier].push({ id: n.id, name: n.name, slug: n.slug });

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    status: p.status,
    deletedAt: p.deleted_at,
    descriptionMd: p.description_md,
    concentration: p.concentration,
    gender: p.gender,
    stockStatus: p.stock_status,
    isFeatured: p.is_featured === 1,
    allergens: p.allergens_text,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    publishedAt: p.published_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    brand: { id: p.brand_id, name: p.brand_name, slug: p.brand_slug },
    family:
      p.family_id && p.family_name && p.family_slug
        ? { id: p.family_id, name: p.family_name, slug: p.family_slug }
        : null,
    notes: tiers,
    variants: variants.map((v) => ({ volumeMl: v.volume_ml, priceKurus: v.price_kurus })),
    images: images.map((i) => ({
      id: i.id,
      alt: i.alt_text,
      width: i.width,
      height: i.height,
      widths: parseWidths(i.widths),
    })),
    minPriceKurus: p.min_price_kurus,
  };
}

export function getPublishedBySlug(slug: string) {
  return loadDetail((eb) => eb.and([eb('perfumes.slug', '=', slug)]), true);
}

export function getPerfumeForAdmin(id: number) {
  return loadDetail((eb) => eb.and([eb('perfumes.id', '=', id)]), false);
}

/** Aynı koku ailesi 2 puan, her ortak nota 1 puan; en az 1 puanlı en fazla 4 parfüm. */
export async function similarPerfumes(perfume: PerfumeDetail, limit = 4): Promise<PerfumeCard[]> {
  const noteIds = NOTE_TIERS.flatMap((t) => perfume.notes[t].map((n) => n.id));
  const familyId = perfume.family?.id ?? -1;
  const noteList = noteIds.length > 0 ? sql.join(noteIds) : sql`-1`;
  const score = sql<number>`(CASE WHEN perfumes.family_id = ${familyId} THEN 2 ELSE 0 END) + (
    SELECT COUNT(DISTINCT pn.note_id) FROM perfume_notes pn
    WHERE pn.perfume_id = perfumes.id AND pn.note_id IN (${noteList})
  )`;
  const rows = await cardSelect(publicPerfumes().where('perfumes.id', '!=', perfume.id))
    .select(score.as('score'))
    .where(score, '>', 0)
    .orderBy('score', 'desc')
    .orderBy('perfumes.published_at', 'desc')
    .limit(limit)
    .execute();
  return rows.map(toCard);
}

export async function publishedForSitemap() {
  return publicPerfumes()
    .select(['perfumes.slug', 'perfumes.updated_at'])
    .orderBy('perfumes.published_at', 'desc')
    .execute();
}

export async function brandWithPublished(slug: string) {
  const brand = await getDb()
    .selectFrom('brands')
    .select(['id', 'name', 'slug', 'description'])
    .where('slug', '=', slug)
    .executeTakeFirst();
  if (!brand) return null;
  const rows = await cardSelect(publicPerfumes().where('perfumes.brand_id', '=', brand.id))
    .orderBy('perfumes.sort_name')
    .execute();
  return { brand, perfumes: rows.map(toCard) };
}

export async function brandsForSitemap() {
  return getDb()
    .selectFrom('brands')
    .select(['slug', 'updated_at'])
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('perfumes')
          .select(sql`1`.as('x'))
          .whereRef('perfumes.brand_id', '=', 'brands.id')
          .where('perfumes.status', '=', 'published')
          .where('perfumes.deleted_at', 'is', null),
      ),
    )
    .execute();
}

// ---------- Panel ----------

export type AdminListFilter = {
  q?: string;
  durum?: 'yayinda' | 'taslak' | 'silinen' | 'tumu';
  sayfa?: number;
};

export async function listForAdmin(filter: AdminListFilter) {
  const db = getDb();
  let qb = db.selectFrom('perfumes').innerJoin('brands', 'brands.id', 'perfumes.brand_id');
  qb = applySearch(qb, filter.q);
  switch (filter.durum) {
    case 'yayinda':
      qb = qb.where('perfumes.status', '=', 'published').where('perfumes.deleted_at', 'is', null);
      break;
    case 'taslak':
      qb = qb.where('perfumes.status', '=', 'draft').where('perfumes.deleted_at', 'is', null);
      break;
    case 'silinen':
      qb = qb.where('perfumes.deleted_at', 'is not', null);
      break;
    default:
      qb = qb.where('perfumes.deleted_at', 'is', null);
  }
  const total = Number(
    (await qb.select((eb) => eb.fn.countAll<number>().as('n')).executeTakeFirstOrThrow()).n,
  );
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, filter.sayfa ?? 1), pageCount);
  const rows = await qb
    .select([
      'perfumes.id',
      'perfumes.name',
      'perfumes.slug',
      'perfumes.status',
      'perfumes.deleted_at',
      'perfumes.updated_at',
      'perfumes.is_featured',
      'perfumes.stock_status',
      'brands.name as brand_name',
      coverSubquery.as('cover_json'),
      (eb) =>
        eb
          .selectFrom('perfume_images')
          .select((e) => e.fn.countAll<number>().as('n'))
          .whereRef('perfume_images.perfume_id', '=', 'perfumes.id')
          .as('image_count'),
    ])
    .orderBy('perfumes.updated_at', 'desc')
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE)
    .execute();
  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      deletedAt: r.deleted_at,
      updatedAt: r.updated_at,
      isFeatured: r.is_featured === 1,
      stockStatus: r.stock_status,
      brandName: r.brand_name,
      imageCount: Number(r.image_count ?? 0),
      cover: parseCover(r.cover_json),
    })),
    total,
    page,
    pageCount,
  };
}

export async function dashboardStats() {
  const row = await sql<{
    published: number;
    draft: number;
    deleted: number;
    unread: number;
    missing_alt: number;
    no_image: number;
  }>`
    SELECT
      (SELECT COUNT(*) FROM perfumes WHERE status = 'published' AND deleted_at IS NULL) AS published,
      (SELECT COUNT(*) FROM perfumes WHERE status = 'draft' AND deleted_at IS NULL) AS draft,
      (SELECT COUNT(*) FROM perfumes WHERE deleted_at IS NOT NULL) AS deleted,
      (SELECT COUNT(*) FROM contact_messages WHERE read_at IS NULL) AS unread,
      (SELECT COUNT(*) FROM perfume_images pi JOIN perfumes p ON p.id = pi.perfume_id
        WHERE p.deleted_at IS NULL AND trim(pi.alt_text) = '') AS missing_alt,
      (SELECT COUNT(*) FROM perfumes p WHERE p.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM perfume_images pi WHERE pi.perfume_id = p.id)) AS no_image
  `.execute(getDb());
  const r = row.rows[0];
  return {
    published: Number(r?.published ?? 0),
    draft: Number(r?.draft ?? 0),
    deleted: Number(r?.deleted ?? 0),
    unread: Number(r?.unread ?? 0),
    missingAlt: Number(r?.missing_alt ?? 0),
    noImage: Number(r?.no_image ?? 0),
  };
}

export async function refreshSearchText(perfumeId: number): Promise<void> {
  const db = getDb();
  const p = await db
    .selectFrom('perfumes')
    .innerJoin('brands', 'brands.id', 'perfumes.brand_id')
    .leftJoin('fragrance_families as ff', 'ff.id', 'perfumes.family_id')
    .select([
      'perfumes.name',
      'brands.name as brand',
      'ff.name as family',
      'perfumes.concentration',
    ])
    .where('perfumes.id', '=', perfumeId)
    .executeTakeFirst();
  if (!p) return;
  const notes = await db
    .selectFrom('perfume_notes')
    .innerJoin('notes', 'notes.id', 'perfume_notes.note_id')
    .select('notes.name')
    .where('perfume_notes.perfume_id', '=', perfumeId)
    .execute();
  const text = foldTr(
    [p.name, p.brand, p.family ?? '', p.concentration, ...notes.map((n) => n.name)].join(' '),
  );
  await db.updateTable('perfumes').set({ search_text: text }).where('id', '=', perfumeId).execute();
}

async function publishProblems(perfumeId: number | null): Promise<string | null> {
  if (perfumeId === null)
    return 'Yayınlamak için önce taslak olarak kaydedip en az bir görsel ekleyin.';
  const images = await getDb()
    .selectFrom('perfume_images')
    .select(['alt_text'])
    .where('perfume_id', '=', perfumeId)
    .execute();
  if (images.length === 0) return 'Yayınlamak için en az bir görsel ekleyin.';
  const missing = images.filter((i) => i.alt_text.trim() === '').length;
  if (missing > 0) return `Yayınlamak için ${missing} görselin alternatif metnini yazın.`;
  return null;
}

function nextUpdatedAt(previous?: string): string {
  const now = Date.now();
  const prev = previous ? Date.parse(previous) : 0;
  return new Date(Math.max(now, prev + 1)).toISOString();
}

export async function savePerfume(
  input: PerfumeInput,
  options: { id?: number; expectedUpdatedAt?: string; isDemo?: boolean } = {},
): Promise<{ id: number; slug: string; updatedAt: string }> {
  const db = getDb();
  const { id, expectedUpdatedAt } = options;

  const brand = await db
    .selectFrom('brands')
    .select('id')
    .where('id', '=', input.brandId)
    .executeTakeFirst();
  if (!brand)
    throw new HttpError('gecersiz', 'Seçilen marka bulunamadı.', {
      brandId: 'Seçilen marka bulunamadı.',
    });
  if (input.familyId !== null) {
    const fam = await db
      .selectFrom('fragrance_families')
      .select('id')
      .where('id', '=', input.familyId)
      .executeTakeFirst();
    if (!fam)
      throw new HttpError('gecersiz', 'Seçilen koku ailesi bulunamadı.', {
        familyId: 'Seçilen koku ailesi bulunamadı.',
      });
  }

  let existing:
    { updated_at: string; published_at: string | null; deleted_at: string | null } | undefined;
  if (id !== undefined) {
    existing = await db
      .selectFrom('perfumes')
      .select(['updated_at', 'published_at', 'deleted_at'])
      .where('id', '=', id)
      .executeTakeFirst();
    if (!existing) throw new HttpError('bulunamadi', 'Parfüm bulunamadı.');
  }

  if (input.status === 'published') {
    const problem = await publishProblems(id ?? null);
    if (problem) throw new HttpError('gecersiz', problem, { status: problem });
  }

  const slug = input.slug
    ? await ensureSlugFree(input.slug, id)
    : await uniqueSlug('perfumes', input.name, id);

  const prices = input.variants.map((v) => v.priceKurus).filter((p): p is number => p !== null);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const iso = nowIso();
  const updatedAt = nextUpdatedAt(existing?.updated_at);
  const publishedAt =
    input.status === 'published'
      ? (existing?.published_at ?? iso)
      : (existing?.published_at ?? null);

  const values = {
    brand_id: input.brandId,
    family_id: input.familyId,
    name: input.name,
    slug,
    description_md: input.description,
    concentration: input.concentration,
    gender: input.gender,
    stock_status: input.stockStatus,
    status: input.status,
    is_featured: input.isFeatured ? 1 : 0,
    allergens_text: input.allergens,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    sort_name: foldTr(input.name),
    search_text: foldTr(input.name),
    min_price_kurus: minPrice,
    published_at: publishedAt,
    updated_at: updatedAt,
  };

  const allNoteNames = NOTE_TIERS.flatMap((t) => input.notes[t]);
  const noteIds = await resolveNoteIds(allNoteNames);

  const perfumeId = await db.transaction().execute(async (trx) => {
    let pid: number;
    if (id === undefined) {
      const row = await trx
        .insertInto('perfumes')
        .values({ ...values, created_at: iso, is_demo: options.isDemo ? 1 : 0 })
        .returning('id')
        .executeTakeFirstOrThrow();
      pid = row.id;
    } else {
      let uq = trx.updateTable('perfumes').set(values).where('id', '=', id);
      if (expectedUpdatedAt !== undefined) uq = uq.where('updated_at', '=', expectedUpdatedAt);
      const r = await uq.executeTakeFirst();
      if (Number(r.numUpdatedRows) === 0) {
        throw new HttpError(
          'cakisma',
          'Bu parfüm siz düzenlerken başka bir sekmede ya da oturumda güncellendi. Değişiklikleriniz bu sayfada duruyor; güncel hâli yeni sekmede açıp karşılaştırın, sonra yeniden kaydedin.',
        );
      }
      pid = id;
      await trx.deleteFrom('perfume_notes').where('perfume_id', '=', pid).execute();
      await trx.deleteFrom('perfume_variants').where('perfume_id', '=', pid).execute();
    }
    const noteRows: Array<{ perfume_id: number; note_id: number; tier: NoteTier }> = [];
    const seen = new Set<string>();
    for (const tier of NOTE_TIERS) {
      for (const name of input.notes[tier]) {
        const noteId = noteIds.get(foldTr(name));
        const key = `${tier}:${noteId}`;
        if (noteId !== undefined && !seen.has(key)) {
          seen.add(key);
          noteRows.push({ perfume_id: pid, note_id: noteId, tier });
        }
      }
    }
    if (noteRows.length > 0) await trx.insertInto('perfume_notes').values(noteRows).execute();
    if (input.variants.length > 0) {
      await trx
        .insertInto('perfume_variants')
        .values(
          input.variants.map((v, i) => ({
            perfume_id: pid,
            volume_ml: v.volumeMl,
            price_kurus: v.priceKurus,
            sort_order: i,
          })),
        )
        .execute();
    }
    return pid;
  });

  await refreshSearchText(perfumeId);
  return { id: perfumeId, slug, updatedAt };
}

async function ensureSlugFree(slug: string, id?: number): Promise<string> {
  let q = getDb().selectFrom('perfumes').select('id').where('slug', '=', slug);
  if (id !== undefined) q = q.where('id', '!=', id);
  if (await q.executeTakeFirst()) {
    throw new HttpError('gecersiz', 'Bu kısa ad başka bir parfümde kullanılıyor.', {
      slug: 'Bu kısa ad başka bir parfümde kullanılıyor.',
    });
  }
  return slug;
}

export async function setStatusBulk(ids: number[], status: PerfumeStatus) {
  const db = getDb();
  const changed: number[] = [];
  const skipped: Array<{ id: number; reason: string }> = [];
  for (const id of ids) {
    const p = await db
      .selectFrom('perfumes')
      .select(['id', 'status', 'published_at', 'updated_at', 'deleted_at'])
      .where('id', '=', id)
      .executeTakeFirst();
    if (!p || p.deleted_at) {
      skipped.push({ id, reason: 'Bulunamadı ya da silinmiş.' });
      continue;
    }
    if (status === 'published') {
      const problem = await publishProblems(id);
      if (problem) {
        skipped.push({ id, reason: problem });
        continue;
      }
    }
    await db
      .updateTable('perfumes')
      .set({
        status,
        updated_at: nextUpdatedAt(p.updated_at),
        published_at: status === 'published' ? (p.published_at ?? nowIso()) : p.published_at,
      })
      .where('id', '=', id)
      .execute();
    changed.push(id);
  }
  return { changed, skipped };
}

export async function softDeletePerfume(id: number) {
  const db = getDb();
  const p = await db
    .selectFrom('perfumes')
    .select(['name', 'updated_at'])
    .where('id', '=', id)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  if (!p) throw new HttpError('bulunamadi', 'Parfüm bulunamadı ya da zaten silinmiş.');
  await db
    .updateTable('perfumes')
    .set({ deleted_at: nowIso(), updated_at: nextUpdatedAt(p.updated_at) })
    .where('id', '=', id)
    .execute();
  return p.name;
}

export async function restorePerfume(id: number) {
  const db = getDb();
  const p = await db
    .selectFrom('perfumes')
    .select(['name', 'updated_at'])
    .where('id', '=', id)
    .where('deleted_at', 'is not', null)
    .executeTakeFirst();
  if (!p) throw new HttpError('bulunamadi', 'Silinmiş parfüm bulunamadı.');
  await db
    .updateTable('perfumes')
    .set({ deleted_at: null, updated_at: nextUpdatedAt(p.updated_at) })
    .where('id', '=', id)
    .execute();
  return p.name;
}

export async function exportRows() {
  return getDb()
    .selectFrom('perfumes')
    .innerJoin('brands', 'brands.id', 'perfumes.brand_id')
    .leftJoin('fragrance_families as ff', 'ff.id', 'perfumes.family_id')
    .leftJoin('perfume_variants as v', 'v.perfume_id', 'perfumes.id')
    .select([
      'perfumes.id',
      'perfumes.name',
      'perfumes.slug',
      'brands.name as brand',
      'ff.name as family',
      'perfumes.concentration',
      'perfumes.status',
      'perfumes.stock_status',
      'perfumes.deleted_at',
      'v.volume_ml',
      'v.price_kurus',
      'perfumes.updated_at',
    ])
    .orderBy('perfumes.id')
    .orderBy('v.sort_order')
    .execute();
}
