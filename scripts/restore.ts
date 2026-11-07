import './env-yukle';
import fs from 'node:fs/promises';
import path from 'node:path';
import { restoreBackup } from '../src/lib/server/backup';
import { closeDb } from '../src/lib/server/db';
import { migrateToLatest } from '../src/lib/server/db/migrate';
import { describeDatabase } from '../src/lib/server/env';

/**
 * Yedekten geri yükleme. Hedef veritabanındaki tüm kayıtlar yedektekilerle değiştirilir;
 * bu yüzden önce `npm run backup` ile mevcut durumun yedeğini alın.
 * Kullanım: npm run restore -- backups/<klasör> --evet
 */
async function main() {
  const source = process.argv[2];
  if (!source || !process.argv.includes('--evet')) {
    throw new Error(
      'Kullanım: npm run restore -- <yedek klasörü> --evet  (önce mevcut durumun yedeğini alın)',
    );
  }
  const dir = path.resolve(source);
  await fs.access(path.join(dir, 'veritabani.json'));
  console.log(`Hedef veritabanı: ${describeDatabase()}`);
  await migrateToLatest();
  const counts = await restoreBackup(dir);
  console.log(`Geri yüklendi: ${dir}`);
  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
