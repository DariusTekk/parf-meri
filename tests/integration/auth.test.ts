import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOGIN_EMAIL_MAX_FAILURES,
  LOGIN_IP_PER_MINUTE,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  attemptLogin,
  createAdmin,
  createSession,
  deleteExpiredSessions,
  deleteSession,
  hashPassword,
  setAdminPassword,
  validateSessionToken,
} from '@/lib/server/auth';
import { getDb } from '@/lib/server/db';
import { freshDb } from './helpers';

const PASSWORD = 'deneme-parola-uzun-123';

describe('Kimlik doğrulama', () => {
  let adminId: number;
  beforeEach(async () => {
    await freshDb();
    adminId = await createAdmin('Yonetici@Ornek.test', PASSWORD);
  });

  it('parola argon2id ile özetlenir, düz metin saklanmaz', async () => {
    const row = await getDb()
      .selectFrom('admins')
      .select(['email', 'password_hash'])
      .executeTakeFirstOrThrow();
    expect(row.email).toBe('yonetici@ornek.test');
    expect(row.password_hash.startsWith('$argon2id$')).toBe(true);
    expect(row.password_hash).toContain('m=19456,t=2,p=1');
    expect(row.password_hash).not.toContain(PASSWORD);
    expect(await hashPassword(PASSWORD)).not.toBe(row.password_hash);
  });

  it('doğru bilgiyle oturum açılır, belirteç veritabanında özet olarak durur', async () => {
    const r = await attemptLogin('yonetici@ornek.test', PASSWORD, '1.1.1.1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const stored = await getDb()
      .selectFrom('sessions')
      .select('token_hash')
      .executeTakeFirstOrThrow();
    expect(stored.token_hash).not.toBe(r.token);
    expect((await validateSessionToken(r.token))?.id).toBe(adminId);
  });

  it('yanlış parola ve olmayan kullanıcı aynı yanıtı alır', async () => {
    expect(await attemptLogin('yonetici@ornek.test', 'yanlis', '1.1.1.1')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await attemptLogin('yok@ornek.test', 'yanlis', '1.1.1.1')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it("5 hatalı denemeden sonra aynı IP'den doğru parola da 15 dakika reddedilir; başka IP etkilenmez", async () => {
    const t0 = new Date('2026-11-06T10:00:00Z');
    for (let i = 0; i < 5; i += 1) {
      const r = await attemptLogin(
        'yonetici@ornek.test',
        'yanlis',
        '10.0.0.1',
        new Date(t0.getTime() + i * 1000),
      );
      expect(r).toEqual({ ok: false, reason: 'invalid' });
    }
    expect(
      await attemptLogin(
        'yonetici@ornek.test',
        PASSWORD,
        '10.0.0.1',
        new Date(t0.getTime() + 10_000),
      ),
    ).toEqual({ ok: false, reason: 'locked' });
    expect(
      (
        await attemptLogin(
          'yonetici@ornek.test',
          PASSWORD,
          '10.0.0.2',
          new Date(t0.getTime() + 11_000),
        )
      ).ok,
    ).toBe(true);
  });

  it('e-posta başına dağıtık hatalı deneme üst sınırı uygulanır', async () => {
    const t0 = new Date('2026-11-06T16:00:00Z');
    for (let i = 0; i < LOGIN_EMAIL_MAX_FAILURES; i += 1) {
      await attemptLogin(
        'yonetici@ornek.test',
        'yanlis',
        `172.16.${i}.1`,
        new Date(t0.getTime() + i * 1000),
      );
    }
    expect(
      await attemptLogin(
        'yonetici@ornek.test',
        PASSWORD,
        '192.168.1.1',
        new Date(t0.getTime() + 60_000),
      ),
    ).toEqual({ ok: false, reason: 'locked' });
    expect(
      (
        await attemptLogin(
          'yonetici@ornek.test',
          PASSWORD,
          '192.168.1.1',
          new Date(t0.getTime() + 20 * 60_000),
        )
      ).ok,
    ).toBe(true);
  });

  it('eşzamanlı hatalı denemeler kilit sınırını aşamaz', async () => {
    const t0 = new Date('2026-11-06T18:00:00Z');
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        attemptLogin('yonetici@ornek.test', 'yanlis', '10.9.9.9', t0),
      ),
    );
    const evaluated = results.filter((r) => !r.ok && r.reason === 'invalid').length;
    expect(evaluated).toBeLessThanOrEqual(5);
  });

  it('başarılı giriş önceki hatalı denemeleri sıfırlar', async () => {
    const t0 = new Date('2026-11-06T12:00:00Z');
    for (let i = 0; i < 4; i += 1)
      await attemptLogin('yonetici@ornek.test', 'yanlis', 'ip', new Date(t0.getTime() + i * 1000));
    expect(
      (await attemptLogin('yonetici@ornek.test', PASSWORD, 'ip', new Date(t0.getTime() + 5000))).ok,
    ).toBe(true);
    for (let i = 0; i < 4; i += 1)
      await attemptLogin(
        'yonetici@ornek.test',
        'yanlis',
        'ip',
        new Date(t0.getTime() + 6000 + i * 1000),
      );
    expect(
      (await attemptLogin('yonetici@ornek.test', PASSWORD, 'ip', new Date(t0.getTime() + 11_000)))
        .ok,
    ).toBe(true);
  });

  it('IP başına dakikadaki deneme sınırı uygulanır', async () => {
    const t0 = new Date('2026-11-06T14:00:00Z');
    for (let i = 0; i < LOGIN_IP_PER_MINUTE; i += 1) {
      await attemptLogin(`kisi${i}@ornek.test`, 'x', 'ayni-ip', new Date(t0.getTime() + i * 100));
    }
    expect(
      await attemptLogin('yonetici@ornek.test', PASSWORD, 'ayni-ip', new Date(t0.getTime() + 5000)),
    ).toEqual({ ok: false, reason: 'rate' });
  });

  it('oturum boşta kalma ve mutlak süre dolunca geçersizdir', async () => {
    const t0 = new Date('2026-11-06T08:00:00Z');
    const token = await createSession(adminId, t0);
    expect(
      await validateSessionToken(token, new Date(t0.getTime() + SESSION_IDLE_MS - 1000)),
    ).not.toBeNull();
    expect(
      await validateSessionToken(token, new Date(t0.getTime() + 2 * SESSION_IDLE_MS + 1000)),
    ).toBeNull();
    expect(await getDb().selectFrom('sessions').select('id').execute()).toHaveLength(0);

    const t1 = new Date('2026-11-07T08:00:00Z');
    const token2 = await createSession(adminId, t1);
    let now = t1.getTime();
    while (now < t1.getTime() + SESSION_ABSOLUTE_MS - SESSION_IDLE_MS) {
      now += SESSION_IDLE_MS - 60_000;
      expect(await validateSessionToken(token2, new Date(now))).not.toBeNull();
    }
    expect(
      await validateSessionToken(token2, new Date(t1.getTime() + SESSION_ABSOLUTE_MS + 1000)),
    ).toBeNull();
  });

  it('çıkış oturumu sunucuda siler; parola değişince tüm oturumlar kapanır', async () => {
    const a = await createSession(adminId);
    const b = await createSession(adminId);
    await deleteSession(a);
    expect(await validateSessionToken(a)).toBeNull();
    expect(await validateSessionToken(b)).not.toBeNull();
    await setAdminPassword('yonetici@ornek.test', 'yeni-parola-yeterince-uzun');
    expect(await validateSessionToken(b)).toBeNull();
  });

  it('süresi dolmuş oturumları toplu siler; geçersiz belirteçleri reddeder', async () => {
    await createSession(adminId, new Date('2020-01-01T00:00:00Z'));
    expect(await deleteExpiredSessions()).toBe(1);
    expect(await validateSessionToken(undefined)).toBeNull();
    expect(await validateSessionToken('x'.repeat(500))).toBeNull();
    expect(await validateSessionToken('olmayan')).toBeNull();
  });
});
