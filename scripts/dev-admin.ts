import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createAdmin, setAdminPassword } from '../src/lib/server/auth';
import { closeDb, getDb } from '../src/lib/server/db';
import { migrateToLatest } from '../src/lib/server/db/migrate';
import { getEnv } from '../src/lib/server/env';

/** Yerel geliştirme için rastgele parolalı deneme yöneticisi; bilgiler data/ altında (git dışı). */
async function main() {
  if (getEnv().isProduction) throw new Error('Bu betik production ortamında çalıştırılamaz.');
  await migrateToLatest();
  const email = 'deneme@yerel.test';
  const password = randomBytes(18).toString('base64url');
  const exists = await getDb()
    .selectFrom('admins')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();
  if (exists) await setAdminPassword(email, password);
  else await createAdmin(email, password);
  const file = path.join(path.dirname(getEnv().databasePath), 'deneme-yonetici.json');
  fs.writeFileSync(file, JSON.stringify({ email, password }));
  console.log(`Deneme yöneticisi hazır; bilgiler: ${file}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
