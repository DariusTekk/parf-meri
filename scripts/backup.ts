import './env-yukle';
import path from 'node:path';
import { createBackup } from '../src/lib/server/backup';
import { closeDb } from '../src/lib/server/db';
import { describeDatabase } from '../src/lib/server/env';

/**
 * Veritabanını (JSON) ve görselleri backups/<zaman damgası>/ klasörüne alır.
 * Vercel'deki veritabanı ve Blob için önce `vercel env pull .env.local` ile ortam alınır.
 */
async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.resolve(process.argv[2] ?? path.join('backups', stamp));
  console.log(`Veritabanı: ${describeDatabase()}`);
  const manifest = await createBackup(target);
  console.log(`Yedek alındı: ${target}`);
  console.table({ ...manifest.counts, gorselDosyasi: manifest.imageFiles });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
