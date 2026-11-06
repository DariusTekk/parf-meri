import fs from 'node:fs/promises';
import path from 'node:path';
import { closeDb, getDb, getSqlite } from '../src/lib/server/db';
import { getEnv } from '../src/lib/server/env';

/**
 * Veritabanının tutarlı bir kopyasını (SQLite çevrimiçi yedekleme API'si) ve yüklenmiş
 * görselleri backups/<zaman damgası>/ klasörüne alır. Uygulama çalışırken de alınabilir.
 */
async function main() {
  const env = getEnv();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.resolve(process.argv[2] ?? path.join('backups', stamp));
  await fs.mkdir(target, { recursive: true });

  await getSqlite().backup(path.join(target, 'app.sqlite'));
  let images = 0;
  try {
    await fs.cp(env.uploadDir, path.join(target, 'uploads'), {
      recursive: true,
      filter: (src) => !src.includes(`${path.sep}tmp`),
    });
    images = (await fs.readdir(path.join(target, 'uploads'))).filter((d) => d !== 'tmp').length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.mkdir(path.join(target, 'uploads'), { recursive: true });
  }
  const db = getDb();
  const perfumes = Number(
    (
      await db
        .selectFrom('perfumes')
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .executeTakeFirstOrThrow()
    ).n,
  );
  const rows = Number(
    (
      await db
        .selectFrom('perfume_images')
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .executeTakeFirstOrThrow()
    ).n,
  );
  const manifest = {
    createdAt: new Date().toISOString(),
    perfumes,
    imageRows: rows,
    imageFolders: images,
  };
  await fs.writeFile(path.join(target, 'yedek.json'), JSON.stringify(manifest, null, 2));
  console.log(`Yedek alındı: ${target}`);
  console.table(manifest);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
