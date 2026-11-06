import { type Kysely, sql } from 'kysely';

const FAMILIES: Array<[string, string]> = [
  ['Çiçeksi', 'ciceksi'],
  ['Odunsu', 'odunsu'],
  ['Amber (oryantal)', 'amber-oryantal'],
  ['Narenciye', 'narenciye'],
  ['Aromatik', 'aromatik'],
  ['Fujer', 'fujer'],
  ['Şipr', 'sipr'],
  ['Gurme', 'gurme'],
  ['Su ve deniz', 'su-ve-deniz'],
  ['Deri', 'deri'],
];

export async function up(db: Kysely<unknown>): Promise<void> {
  let order = 0;
  for (const [name, slug] of FAMILIES) {
    order += 10;
    await sql`INSERT OR IGNORE INTO fragrance_families (name, slug, sort_order, is_demo)
      VALUES (${name}, ${slug}, ${order}, 0)`.execute(db);
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const [, slug] of FAMILIES) {
    await sql`DELETE FROM fragrance_families WHERE slug = ${slug}
      AND id NOT IN (SELECT family_id FROM perfumes WHERE family_id IS NOT NULL)`.execute(db);
  }
}
