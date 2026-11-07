import fs from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'kysely';
import { getDb } from './db';
import { parseWidths } from './perfumes';
import { getImageStorage } from './storage';

/** Yedeğe giren tablolar, yabancı anahtar sırasıyla. Oturumlar ve hız sınırı kayıtları geçicidir. */
export const BACKUP_TABLES = [
  'admins',
  'brands',
  'fragrance_families',
  'notes',
  'perfumes',
  'perfume_notes',
  'perfume_variants',
  'perfume_images',
  'site_settings',
  'contact_messages',
  'audit_log',
] as const;

const SERIAL_TABLES = BACKUP_TABLES.filter(
  (t) => !['perfume_notes', 'perfume_images', 'site_settings'].includes(t),
);

export type BackupManifest = {
  createdAt: string;
  counts: Record<string, number>;
  imageFiles: number;
};

/** Veritabanını JSON olarak, görselleri dosya olarak hedef klasöre yazar. */
export async function createBackup(target: string): Promise<BackupManifest> {
  const db = getDb();
  await fs.mkdir(path.join(target, 'gorseller'), { recursive: true });
  const counts: Record<string, number> = {};
  const data: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    const rows = await db.selectFrom(table).selectAll().execute();
    data[table] = rows;
    counts[table] = rows.length;
  }
  await fs.writeFile(path.join(target, 'veritabani.json'), JSON.stringify(data));

  const storage = getImageStorage();
  let imageFiles = 0;
  const images = (data.perfume_images ?? []) as Array<{ id: string; widths: string }>;
  for (const img of images) {
    const dir = path.join(target, 'gorseller', img.id);
    await fs.mkdir(dir, { recursive: true });
    for (const w of parseWidths(img.widths)) {
      for (const ext of ['webp', 'avif']) {
        const buf = await storage.read(img.id, `${w}.${ext}`);
        if (buf) {
          await fs.writeFile(path.join(dir, `${w}.${ext}`), buf);
          imageFiles += 1;
        }
      }
    }
  }
  const manifest: BackupManifest = { createdAt: new Date().toISOString(), counts, imageFiles };
  await fs.writeFile(path.join(target, 'yedek.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * Yedekten geri yükleme: tablolar tek işlemde boşaltılıp yedekteki satırlarla doldurulur,
 * kimlik sayaçları ayarlanır, ardından görseller depoya yazılır.
 */
export async function restoreBackup(source: string): Promise<Record<string, number>> {
  const raw = await fs.readFile(path.join(source, 'veritabani.json'), 'utf8');
  const data = JSON.parse(raw) as Record<string, Array<Record<string, unknown>>>;
  const db = getDb();
  await db.transaction().execute(async (trx) => {
    await sql`TRUNCATE ${sql.join(
      [...BACKUP_TABLES, 'sessions', 'rate_events'].map((t) => sql.table(t)),
    )} RESTART IDENTITY CASCADE`.execute(trx);
    for (const table of BACKUP_TABLES) {
      const rows = data[table] ?? [];
      for (let i = 0; i < rows.length; i += 200) {
        // Satırlar aynı şemadan alınmış yedekten gelir; tablo türüne göre ayrıca daraltılmaz.
        await trx
          .insertInto(table)
          .values(rows.slice(i, i + 200) as never)
          .execute();
      }
    }
    for (const table of SERIAL_TABLES) {
      await sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'),
        COALESCE((SELECT MAX(id) FROM ${sql.table(table)}), 0) + 1, false)`.execute(trx);
    }
  });

  const storage = getImageStorage();
  const dir = path.join(source, 'gorseller');
  let ids: string[] = [];
  try {
    ids = await fs.readdir(dir);
  } catch {
    ids = [];
  }
  for (const id of ids) {
    const names = await fs.readdir(path.join(dir, id));
    const files = await Promise.all(
      names.map(async (name) => ({
        name,
        data: await fs.readFile(path.join(dir, id, name)),
        contentType: name.endsWith('.avif') ? 'image/avif' : 'image/webp',
      })),
    );
    await storage.remove(id);
    await storage.write(id, files);
  }
  return Object.fromEntries(BACKUP_TABLES.map((t) => [t, (data[t] ?? []).length]));
}
