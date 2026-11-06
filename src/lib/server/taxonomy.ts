import { sql } from 'kysely';
import { getDb } from './db';
import { HttpError } from './http';
import { nowIso } from '@/lib/shared/format';
import { foldTr, slugify } from '@/lib/shared/text';

export async function uniqueSlug(
  table: 'brands' | 'notes' | 'fragrance_families' | 'perfumes',
  base: string,
  excludeId?: number,
): Promise<string> {
  const root = slugify(base) || 'kayit';
  const db = getDb();
  for (let i = 1; i < 500; i += 1) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    let q = db.selectFrom(table).select('id').where('slug', '=', candidate);
    if (excludeId !== undefined) q = q.where('id', '!=', excludeId);
    if (!(await q.executeTakeFirst())) return candidate;
  }
  throw new HttpError('cakisma', 'Benzersiz kısa ad üretilemedi.');
}

export async function listBrands() {
  return getDb()
    .selectFrom('brands')
    .select([
      'brands.id',
      'brands.name',
      'brands.slug',
      'brands.description',
      (eb) =>
        eb
          .selectFrom('perfumes')
          .select((e) => e.fn.countAll<number>().as('n'))
          .whereRef('perfumes.brand_id', '=', 'brands.id')
          .where('perfumes.deleted_at', 'is', null)
          .as('perfumeCount'),
    ])
    .orderBy(sql`lower(brands.name)`)
    .execute();
}

export async function listFamilies() {
  return getDb()
    .selectFrom('fragrance_families')
    .select([
      'fragrance_families.id',
      'fragrance_families.name',
      'fragrance_families.slug',
      (eb) =>
        eb
          .selectFrom('perfumes')
          .select((e) => e.fn.countAll<number>().as('n'))
          .whereRef('perfumes.family_id', '=', 'fragrance_families.id')
          .where('perfumes.deleted_at', 'is', null)
          .as('perfumeCount'),
    ])
    .orderBy('sort_order')
    .orderBy('name')
    .execute();
}

export async function listNotes() {
  return getDb()
    .selectFrom('notes')
    .select([
      'notes.id',
      'notes.name',
      'notes.slug',
      (eb) =>
        eb
          .selectFrom('perfume_notes')
          .select((e) => e.fn.count<number>('perfume_notes.perfume_id').distinct().as('n'))
          .whereRef('perfume_notes.note_id', '=', 'notes.id')
          .as('perfumeCount'),
    ])
    .orderBy(sql`lower(notes.name)`)
    .execute();
}

type Kind = 'brand' | 'family' | 'note';
const TABLES = { brand: 'brands', family: 'fragrance_families', note: 'notes' } as const;

export async function createTaxonomy(kind: Kind, name: string, description?: string | null) {
  const db = getDb();
  const table = TABLES[kind];
  const existing = await findByFoldedName(kind, name);
  if (existing)
    throw new HttpError('cakisma', 'Bu adla bir kayıt zaten var.', {
      name: 'Bu adla bir kayıt zaten var.',
    });
  const slug = await uniqueSlug(table, name);
  if (kind === 'brand') {
    const iso = nowIso();
    const row = await db
      .insertInto('brands')
      .values({ name, slug, description: description ?? null, created_at: iso, updated_at: iso })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  }
  if (kind === 'family') {
    const max = await db
      .selectFrom('fragrance_families')
      .select((eb) => eb.fn.max('sort_order').as('m'))
      .executeTakeFirst();
    const row = await db
      .insertInto('fragrance_families')
      .values({ name, slug, sort_order: Number(max?.m ?? 0) + 10 })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  }
  const row = await db
    .insertInto('notes')
    .values({ name, slug })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function renameTaxonomy(
  kind: Kind,
  id: number,
  name: string,
  description?: string | null,
) {
  const db = getDb();
  const existing = await findByFoldedName(kind, name);
  if (existing && existing.id !== id) {
    throw new HttpError('cakisma', 'Bu adla bir kayıt zaten var.', {
      name: 'Bu adla bir kayıt zaten var.',
    });
  }
  let affected: bigint;
  if (kind === 'brand') {
    const r = await db
      .updateTable('brands')
      .set({ name, description: description ?? null, updated_at: nowIso() })
      .where('id', '=', id)
      .executeTakeFirst();
    affected = r.numUpdatedRows;
  } else {
    const r = await db
      .updateTable(TABLES[kind])
      .set({ name })
      .where('id', '=', id)
      .executeTakeFirst();
    affected = r.numUpdatedRows;
  }
  if (Number(affected) === 0) throw new HttpError('bulunamadi', 'Kayıt bulunamadı.');
  if (kind !== 'family') await refreshSearchTextFor(kind, id);
}

export async function deleteTaxonomy(kind: Kind, id: number) {
  const db = getDb();
  if (kind === 'brand') {
    const used = await db
      .selectFrom('perfumes')
      .select('id')
      .where('brand_id', '=', id)
      .executeTakeFirst();
    if (used) {
      throw new HttpError(
        'cakisma',
        'Bu markaya bağlı parfümler var (silinenler dahil). Önce onları başka markaya taşıyın.',
      );
    }
  }
  if (kind === 'note') {
    const used = await db
      .selectFrom('perfume_notes')
      .select('perfume_id')
      .where('note_id', '=', id)
      .executeTakeFirst();
    if (used) throw new HttpError('cakisma', 'Bu nota en az bir parfümde kullanılıyor.');
  }
  if (kind === 'family') {
    const used = await db
      .selectFrom('perfumes')
      .select('id')
      .where('family_id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (used) throw new HttpError('cakisma', 'Bu koku ailesine bağlı parfümler var.');
  }
  const r = await db.deleteFrom(TABLES[kind]).where('id', '=', id).executeTakeFirst();
  if (Number(r.numDeletedRows) === 0) throw new HttpError('bulunamadi', 'Kayıt bulunamadı.');
}

async function findByFoldedName(kind: Kind, name: string) {
  const rows = await getDb().selectFrom(TABLES[kind]).select(['id', 'name']).execute();
  const folded = foldTr(name);
  return rows.find((r) => foldTr(r.name) === folded);
}

/** Nota adlarını kimliklere çevirir; olmayanları oluşturur. */
export async function resolveNoteIds(names: string[]): Promise<Map<string, number>> {
  const db = getDb();
  const all = await db.selectFrom('notes').select(['id', 'name']).execute();
  const byFolded = new Map(all.map((n) => [foldTr(n.name), n.id]));
  const result = new Map<string, number>();
  for (const raw of names) {
    const name = raw.trim();
    const key = foldTr(name);
    if (!key) continue;
    let id = byFolded.get(key);
    if (id === undefined) {
      const slug = await uniqueSlug('notes', name);
      id = (
        await db
          .insertInto('notes')
          .values({ name, slug })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
      byFolded.set(key, id);
    }
    result.set(key, id);
  }
  return result;
}

async function refreshSearchTextFor(kind: 'brand' | 'note', id: number) {
  const { refreshSearchText } = await import('./perfumes');
  const db = getDb();
  const ids =
    kind === 'brand'
      ? (await db.selectFrom('perfumes').select('id').where('brand_id', '=', id).execute()).map(
          (r) => r.id,
        )
      : (
          await db
            .selectFrom('perfume_notes')
            .select('perfume_id as id')
            .where('note_id', '=', id)
            .execute()
        ).map((r) => r.id);
  for (const pid of new Set(ids)) await refreshSearchText(pid);
}
