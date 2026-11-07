import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'kysely';
import { beforeAll, describe, expect, it } from 'vitest';
import { audit, listAudit } from '@/lib/server/audit';
import {
  CONTACT_RETENTION_DAYS,
  deleteMessage,
  listMessages,
  markMessageRead,
  purgeOldMessages,
  submitContact,
} from '@/lib/server/contact';
import { getDb } from '@/lib/server/db';
import { migrateAllDown, migrateToLatest } from '@/lib/server/db/migrate';
import { clearDemo, demoCounts, loadDemo } from '@/lib/server/demo';
import { HttpError } from '@/lib/server/http';
import { uploadRoot } from '@/lib/server/images';
import { listPublished } from '@/lib/server/perfumes';
import { getSettings, saveSettings } from '@/lib/server/settings';
import {
  createTaxonomy,
  deleteTaxonomy,
  listBrands,
  listFamilies,
  listNotes,
  renameTaxonomy,
} from '@/lib/server/taxonomy';
import { siteDefaults } from '@/config/site';
import { freshDb } from './helpers';

const tables = async () =>
  (
    await sql<{
      name: string;
    }>`SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name NOT LIKE 'kysely_%'`.execute(getDb())
  ).rows
    .map((r) => r.name)
    .sort();

describe('Migrasyonlar', () => {
  it('yukarı, aşağı, yukarı sırasıyla sorunsuz çalışır', async () => {
    await migrateToLatest();
    const up = await tables();
    expect(up).toContain('perfumes');
    await migrateAllDown();
    expect(await tables()).toEqual([]);
    await migrateToLatest();
    expect(await tables()).toEqual(up);
    expect((await listFamilies()).length).toBeGreaterThanOrEqual(10);
  });
});

describe('Demo veri', () => {
  beforeAll(async () => {
    await freshDb();
  });

  it('tek komutla yüklenir: en az 12 parfüm, 3 marka, 2 taslak', async () => {
    const c = await loadDemo();
    expect(c.perfumes).toBeGreaterThanOrEqual(12);
    expect(c.brands).toBe(3);
    expect(c.drafts).toBeGreaterThanOrEqual(2);
    expect(c.published).toBeGreaterThanOrEqual(12);
    expect((await listPublished({})).total).toBe(c.published);
  }, 60_000);

  it('tekrar yüklemek çift kayıt üretmez', async () => {
    const c = await loadDemo();
    expect(c.brands).toBe(3);
  }, 60_000);

  it('tek komutla silinir; demo kaydı ve görsel klasörü kalmaz, gerçek kayıtlar korunur', async () => {
    const real = await createTaxonomy('brand', 'Gerçek Marka');
    const demoImages = await getDb()
      .selectFrom('perfume_images')
      .innerJoin('perfumes', 'perfumes.id', 'perfume_images.perfume_id')
      .select('perfume_images.id')
      .where('perfumes.is_demo', '=', 1)
      .execute();
    const c = await clearDemo();
    expect(c).toEqual({
      perfumes: 0,
      published: 0,
      drafts: 0,
      brands: 0,
      families: 0,
      notes: 0,
      images: 0,
    });
    expect(await demoCounts()).toEqual(c);
    for (const img of demoImages)
      expect(fs.existsSync(path.join(uploadRoot(), img.id))).toBe(false);
    expect((await listBrands()).map((b) => b.id)).toEqual([real]);
  });
});

describe('İletişim ve KVKK saklama süresi', () => {
  beforeAll(async () => {
    await freshDb();
  });

  it('mesaj kaydedilir, okundu işaretlenir ve silinir', async () => {
    await submitContact(
      { name: 'Ayşe', contact: 'ayse@ornek.test', message: 'Bilgi almak istiyorum.' },
      'ip-1',
    );
    const [m] = await listMessages();
    expect(m?.name).toBe('Ayşe');
    await markMessageRead(m!.id, true);
    expect((await listMessages())[0]?.read_at).not.toBeNull();
    await deleteMessage(m!.id);
    expect(await listMessages()).toHaveLength(0);
  });

  it('aynı IP saatte en fazla 5 mesaj gönderebilir', async () => {
    const t = new Date('2026-11-06T10:00:00Z');
    for (let i = 0; i < 5; i += 1)
      await submitContact(
        { name: 'Ali', contact: '05551112233', message: 'Merhaba, bilgi.' },
        'ip-2',
        t,
      );
    await expect(
      submitContact({ name: 'Ali', contact: '05551112233', message: 'Merhaba, bilgi.' }, 'ip-2', t),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it(`${CONTACT_RETENTION_DAYS} günden eski mesajlar silinir`, async () => {
    await getDb().deleteFrom('contact_messages').execute();
    await getDb()
      .insertInto('contact_messages')
      .values({
        name: 'Eski',
        contact: 'x@y.test',
        message: 'eski mesaj',
        created_at: '2020-01-01T00:00:00Z',
      })
      .execute();
    await getDb()
      .insertInto('contact_messages')
      .values({
        name: 'Yeni',
        contact: 'x@y.test',
        message: 'yeni mesaj',
        created_at: new Date().toISOString(),
      })
      .execute();
    expect(await purgeOldMessages()).toBe(1);
    expect((await listMessages()).map((m) => m.name)).toEqual(['Yeni']);
  });
});

describe('Ayarlar, taksonomi ve işlem geçmişi', () => {
  beforeAll(async () => {
    await freshDb();
  });

  it('ayar yoksa varsayılanlar, kayıtlıysa kayıtlı değerler okunur', async () => {
    expect(await getSettings()).toEqual(siteDefaults);
    await saveSettings({ ...siteDefaults, siteName: 'Yeni Ad' });
    expect((await getSettings()).siteName).toBe('Yeni Ad');
  });

  it('aynı adlı kayıt (Türkçe katlamayla) ikinci kez eklenemez', async () => {
    await createTaxonomy('note', 'Çiçek');
    await expect(createTaxonomy('note', 'CİCEK')).rejects.toBeInstanceOf(HttpError);
    const id = await createTaxonomy('family', 'Yeni Aile');
    await renameTaxonomy('family', id, 'Yeni Aile 2');
    expect((await listFamilies()).some((f) => f.name === 'Yeni Aile 2')).toBe(true);
    await deleteTaxonomy('family', id);
    expect((await listNotes()).map((n) => n.name)).toEqual(['Çiçek']);
  });

  it('işlem geçmişi en yeniden eskiye listelenir', async () => {
    await audit(null, 'a', 'x', 1, 'birinci');
    await audit(null, 'b', 'x', 2, 'ikinci');
    expect((await listAudit(2)).map((r) => r.summary)).toEqual(['ikinci', 'birinci']);
  });
});
