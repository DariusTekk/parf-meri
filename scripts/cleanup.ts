import './env-yukle';
import { deleteExpiredSessions } from '../src/lib/server/auth';
import { purgeOldMessages } from '../src/lib/server/contact';
import { closeDb } from '../src/lib/server/db';
import { cleanupOrphans } from '../src/lib/server/images';

/** Günlük bakım: yetim görsel dosyaları, süresi dolmuş oturumlar ve saklama süresi geçmiş mesajlar. */
async function main() {
  const files = await cleanupOrphans();
  const sessions = await deleteExpiredSessions();
  const messages = await purgeOldMessages();
  console.table({ ...files, expiredSessions: sessions, purgedMessages: messages });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
