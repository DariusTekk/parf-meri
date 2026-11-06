import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { sql } from 'kysely';
import { getDb } from './db';
import { nowIso } from '@/lib/shared/format';

/** OWASP Parola Saklama önerisi: argon2id, m=19 MiB, t=2, p=1. */
const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const SESSION_TOUCH_MS = 5 * 60 * 1000;

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_IP_PER_MINUTE = 20;
export const LOGIN_EMAIL_MAX_FAILURES = 30;

// Kullanıcı yoksa da aynı sürede yanıt vermek için kullanılan özet; modül yüklenirken üretilir.
const dummyHash: Promise<string> = hash(randomBytes(16).toString('hex'), ARGON_OPTIONS);

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export type SessionAdmin = { id: number; email: string; sessionId: number };

export async function createSession(adminId: number, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const iso = now.toISOString();
  await getDb()
    .insertInto('sessions')
    .values({
      admin_id: adminId,
      token_hash: sha256(token),
      created_at: iso,
      last_seen_at: iso,
      expires_at: new Date(now.getTime() + SESSION_ABSOLUTE_MS).toISOString(),
    })
    .execute();
  return token;
}

export async function validateSessionToken(
  token: string | undefined,
  now = new Date(),
): Promise<SessionAdmin | null> {
  if (!token || token.length > 100) return null;
  const db = getDb();
  const row = await db
    .selectFrom('sessions')
    .innerJoin('admins', 'admins.id', 'sessions.admin_id')
    .select([
      'sessions.id as sessionId',
      'sessions.last_seen_at',
      'sessions.expires_at',
      'admins.id',
      'admins.email',
    ])
    .where('sessions.token_hash', '=', sha256(token))
    .executeTakeFirst();
  if (!row) return null;
  const nowMs = now.getTime();
  const idleExpired = nowMs - Date.parse(row.last_seen_at) > SESSION_IDLE_MS;
  const absoluteExpired = nowMs > Date.parse(row.expires_at);
  if (idleExpired || absoluteExpired) {
    await db.deleteFrom('sessions').where('id', '=', row.sessionId).execute();
    return null;
  }
  if (nowMs - Date.parse(row.last_seen_at) > SESSION_TOUCH_MS) {
    await db
      .updateTable('sessions')
      .set({ last_seen_at: now.toISOString() })
      .where('id', '=', row.sessionId)
      .execute();
  }
  return { id: row.id, email: row.email, sessionId: row.sessionId };
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await getDb().deleteFrom('sessions').where('token_hash', '=', sha256(token)).execute();
}

export async function deleteExpiredSessions(now = new Date()): Promise<number> {
  const result = await getDb()
    .deleteFrom('sessions')
    .where((eb) =>
      eb.or([
        eb('expires_at', '<', now.toISOString()),
        eb('last_seen_at', '<', new Date(now.getTime() - SESSION_IDLE_MS).toISOString()),
      ]),
    )
    .executeTakeFirst();
  return Number(result.numDeletedRows);
}

export type LoginResult =
  | { ok: true; adminId: number; token: string }
  | { ok: false; reason: 'invalid' | 'locked' | 'rate' };

async function countEvents(kind: string, key: string, sinceIso: string, success?: number) {
  let q = getDb()
    .selectFrom('rate_events')
    .select((eb) => eb.fn.countAll<number>().as('n'))
    .where('kind', '=', kind)
    .where('key', '=', key)
    .where('created_at', '>=', sinceIso);
  if (success !== undefined) q = q.where('success', '=', success);
  const row = await q.executeTakeFirstOrThrow();
  return Number(row.n);
}

async function recordEvent(
  kind: string,
  key: string,
  success: boolean,
  now: Date,
): Promise<number> {
  const row = await getDb()
    .insertInto('rate_events')
    .values({ kind, key, success: success ? 1 : 0, created_at: now.toISOString() })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

/**
 * Kilit denetimi ve "hatalı" olarak ön kayıt tek bir işlemde, e-postaya özgü danışma kilidi
 * (pg_advisory_xact_lock) altında yapılır; aynı e-postaya paralel denemeler sırayla değerlendirilir
 * ve sınırı aşamaz. Kilitliyse null döner.
 */
async function reserveLoginAttempt(
  emailKey: string,
  emailIpKey: string,
  windowStart: string,
  now: Date,
): Promise<number[] | null> {
  return getDb()
    .transaction()
    .execute(async (trx) => {
      await sql`SELECT pg_advisory_xact_lock(hashtext(${emailKey}))`.execute(trx);
      const last = await trx
        .selectFrom('rate_events')
        .select((eb) => eb.fn.max('created_at').as('t'))
        .where('kind', '=', 'login_email')
        .where('key', '=', emailKey)
        .where('success', '=', 1)
        .executeTakeFirst();
      const lastAt = last?.t ?? null;
      const since = lastAt && lastAt > windowStart ? lastAt : windowStart;
      const count = async (kind: string, key: string) =>
        Number(
          (
            await trx
              .selectFrom('rate_events')
              .select((eb) => eb.fn.countAll<string>().as('n'))
              .where('kind', '=', kind)
              .where('key', '=', key)
              .where('success', '=', 0)
              .where('created_at', '>=', since)
              .executeTakeFirstOrThrow()
          ).n,
        );
      if (
        (await count('login', emailIpKey)) >= LOGIN_MAX_FAILURES ||
        (await count('login_email', emailKey)) >= LOGIN_EMAIL_MAX_FAILURES
      ) {
        return null;
      }
      const iso = now.toISOString();
      const rows = await trx
        .insertInto('rate_events')
        .values([
          { kind: 'login', key: emailIpKey, success: 0, created_at: iso },
          { kind: 'login_email', key: emailKey, success: 0, created_at: iso },
        ])
        .returning('id')
        .execute();
      return rows.map((r) => r.id);
    });
}

/**
 * Giriş denemesi.
 * - Aynı e-posta ve IP için 15 dakikada 5 hatalı denemeden sonra 15 dakika bekleme. Kilit IP'ye
 *   bağlı olduğundan e-postayı bilen biri yöneticiyi başka bir ağdan dışarıda bırakamaz.
 * - Dağıtık denemelere karşı e-posta başına 15 dakikada 30 hatalı deneme üst sınırı.
 * - IP başına dakikada 20 deneme.
 * Deneme, parola doğrulanmadan önce "hatalı" olarak kaydedilir; eşzamanlı istekler sınırı aşamaz.
 * Başarılı giriş, önceki hatalı denemeleri sayımdan çıkarır.
 */
export async function attemptLogin(
  email: string,
  password: string,
  ip: string,
  now = new Date(),
): Promise<LoginResult> {
  const db = getDb();
  const emailKey = sha256(`login:${email.toLowerCase()}`);
  const emailIpKey = sha256(`login:${email.toLowerCase()}|${ip}`);
  const ipKey = sha256(`ip:${ip}`);
  const windowStart = new Date(now.getTime() - LOGIN_WINDOW_MS).toISOString();
  const minuteStart = new Date(now.getTime() - 60_000).toISOString();

  if ((await countEvents('login_ip', ipKey, minuteStart)) >= LOGIN_IP_PER_MINUTE) {
    return { ok: false, reason: 'rate' };
  }
  await recordEvent('login_ip', ipKey, false, now);

  const pendingIds = await reserveLoginAttempt(emailKey, emailIpKey, windowStart, now);
  if (!pendingIds) return { ok: false, reason: 'locked' };

  const admin = await db
    .selectFrom('admins')
    .select(['id', 'password_hash'])
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst();

  const valid = admin
    ? await verifyPassword(admin.password_hash, password)
    : (await verifyPassword(await dummyHash, password)) && false;

  if (!valid || !admin) return { ok: false, reason: 'invalid' };
  await db.updateTable('rate_events').set({ success: 1 }).where('id', 'in', pendingIds).execute();

  const token = await createSession(admin.id, now);
  return { ok: true, adminId: admin.id, token };
}

export async function createAdmin(email: string, password: string): Promise<number> {
  const iso = nowIso();
  const result = await getDb()
    .insertInto('admins')
    .values({
      email: email.toLowerCase(),
      password_hash: await hashPassword(password),
      created_at: iso,
      updated_at: iso,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return result.id;
}

export async function setAdminPassword(email: string, password: string): Promise<boolean> {
  const result = await getDb()
    .updateTable('admins')
    .set({ password_hash: await hashPassword(password), updated_at: nowIso() })
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst();
  const changed = Number(result.numUpdatedRows) > 0;
  if (changed) {
    const admin = await getDb()
      .selectFrom('admins')
      .select('id')
      .where('email', '=', email.toLowerCase())
      .executeTakeFirstOrThrow();
    await getDb().deleteFrom('sessions').where('admin_id', '=', admin.id).execute();
  }
  return changed;
}
