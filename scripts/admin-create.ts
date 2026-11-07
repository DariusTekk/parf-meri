import './env-yukle';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createAdmin, setAdminPassword } from '../src/lib/server/auth';
import { closeDb, getDb } from '../src/lib/server/db';
import { migrateToLatest } from '../src/lib/server/db/migrate';
import { describeDatabase } from '../src/lib/server/env';
import { loginSchema, passwordSchema } from '../src/lib/shared/schemas';

async function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) write.call(rl, s);
      else write.call(rl, '*'.repeat(s.length > 0 && s !== '\r\n' && s !== '\n' ? 1 : 0));
    };
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write('\n');
  return answer;
}

async function main() {
  // Hesabın hangi veritabanına yazılacağı baştan gösterilir (yerel PGlite mi, canlı PostgreSQL mi).
  console.log(`Hedef veritabanı: ${describeDatabase()}`);
  await migrateToLatest();
  let email = process.env.ADMIN_EMAIL?.trim() ?? '';
  let password = process.env.ADMIN_PASSWORD ?? '';
  const interactive = !email || !password;
  if (interactive) {
    if (!stdin.isTTY) {
      throw new Error(
        'ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenlerini verin ya da komutu bir terminalde çalıştırın.',
      );
    }
    email = email || (await ask('Yönetici e-posta adresi: '));
    password = await ask('Parola (en az 12 karakter): ', true);
    const again = await ask('Parola (tekrar): ', true);
    if (password !== again) throw new Error('Parolalar eşleşmiyor.');
  }
  const parsedEmail = loginSchema.shape.email.safeParse(email);
  if (!parsedEmail.success) throw new Error('Geçerli bir e-posta adresi girin.');
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success)
    throw new Error(parsedPassword.error.issues[0]?.message ?? 'Parola geçersiz.');

  const existing = await getDb()
    .selectFrom('admins')
    .select('id')
    .where('email', '=', parsedEmail.data)
    .executeTakeFirst();
  if (existing) {
    await setAdminPassword(parsedEmail.data, parsedPassword.data);
    console.log('Yöneticinin parolası güncellendi; açık oturumları sonlandırıldı.');
  } else {
    await createAdmin(parsedEmail.data, parsedPassword.data);
    console.log('Yönetici oluşturuldu.');
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
