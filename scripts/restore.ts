import fs from 'node:fs/promises';
import path from 'node:path';
import SQLite from 'better-sqlite3';
import { getEnv } from '../src/lib/server/env';

/**
 * Yedekten geri yükleme. Uygulama durdurulmuş olmalıdır. Mevcut veritabanı ve görseller
 * önce "<ad>.geri-yukleme-oncesi" adıyla kenara alınır, sonra yedek kopyalanır.
 * Kullanım: npm run restore -- backups/<klasör> --evet
 */
async function main() {
  const source = process.argv[2];
  if (!source || !process.argv.includes('--evet')) {
    throw new Error(
      'Kullanım: npm run restore -- <yedek klasörü> --evet  (uygulamayı önce durdurun)',
    );
  }
  const dir = path.resolve(source);
  const dbFile = path.join(dir, 'app.sqlite');
  await fs.access(dbFile);
  const check = new SQLite(dbFile, { readonly: true });
  const integrity = check.pragma('integrity_check', { simple: true });
  check.close();
  if (integrity !== 'ok') throw new Error(`Yedek veritabanı bozuk görünüyor: ${String(integrity)}`);

  const env = getEnv();
  const suffix = `.geri-yukleme-oncesi-${Date.now()}`;
  await fs.mkdir(path.dirname(env.databasePath), { recursive: true });
  for (const ext of ['', '-wal', '-shm']) {
    const f = `${env.databasePath}${ext}`;
    try {
      await fs.rename(f, `${f}${suffix}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  await fs.copyFile(dbFile, env.databasePath);

  try {
    await fs.rename(env.uploadDir, `${env.uploadDir}${suffix}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await fs.cp(path.join(dir, 'uploads'), env.uploadDir, { recursive: true });

  const db = new SQLite(env.databasePath, { readonly: true });
  const perfumes = (db.prepare('SELECT COUNT(*) AS n FROM perfumes').get() as { n: number }).n;
  const images = (db.prepare('SELECT COUNT(*) AS n FROM perfume_images').get() as { n: number }).n;
  db.close();
  console.log(`Geri yüklendi: ${dir}`);
  console.log(
    `Parfüm: ${perfumes}, görsel kaydı: ${images}. Önceki dosyalar "${suffix}" ekiyle saklandı.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
