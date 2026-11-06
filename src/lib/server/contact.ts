import { getDb } from './db';
import { sha256 } from './auth';
import { HttpError } from './http';
import { nowIso } from '@/lib/shared/format';

export const CONTACT_RETENTION_DAYS = 180;
const CONTACT_PER_HOUR = 5;
// Vekil sunucu yokken (TRUST_PROXY kapalı) tüm ziyaretçiler tek kovayı paylaşır; tek kişinin formu
// herkese kapatmasını önlemek için bu durumda daha yüksek, küresel bir sınır uygulanır.
const CONTACT_PER_HOUR_SHARED = 60;

export async function submitContact(
  input: { name: string; contact: string; message: string; perfumeSlug?: string },
  ip: string,
  now = new Date(),
) {
  const db = getDb();
  const key = sha256(`contact:${ip}`);
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
  const recent = await db
    .selectFrom('rate_events')
    .select((eb) => eb.fn.countAll<number>().as('n'))
    .where('kind', '=', 'contact')
    .where('key', '=', key)
    .where('created_at', '>=', hourAgo)
    .executeTakeFirstOrThrow();
  if (Number(recent.n) >= (ip === 'dogrudan' ? CONTACT_PER_HOUR_SHARED : CONTACT_PER_HOUR)) {
    throw new HttpError(
      'cok_fazla_istek',
      'Kısa sürede çok fazla mesaj gönderildi. Lütfen bir saat sonra tekrar deneyin.',
    );
  }
  let perfumeId: number | null = null;
  if (input.perfumeSlug) {
    const p = await db
      .selectFrom('perfumes')
      .select('id')
      .where('slug', '=', input.perfumeSlug)
      .where('status', '=', 'published')
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    perfumeId = p?.id ?? null;
  }
  await db
    .insertInto('rate_events')
    .values({ kind: 'contact', key, success: 1, created_at: now.toISOString() })
    .execute();
  // Saklama süresi dolan mesajlar her yeni mesajda da temizlenir; ayrı zamanlayıcıya bağlı kalınmaz.
  await purgeOldMessages(now);
  await db
    .insertInto('contact_messages')
    .values({
      name: input.name,
      contact: input.contact,
      message: input.message,
      perfume_id: perfumeId,
      created_at: now.toISOString(),
    })
    .execute();
}

export async function listMessages() {
  await purgeOldMessages();
  return getDb()
    .selectFrom('contact_messages')
    .leftJoin('perfumes', 'perfumes.id', 'contact_messages.perfume_id')
    .select([
      'contact_messages.id',
      'contact_messages.name',
      'contact_messages.contact',
      'contact_messages.message',
      'contact_messages.created_at',
      'contact_messages.read_at',
      'perfumes.name as perfume_name',
      'perfumes.id as perfume_id',
    ])
    .orderBy('contact_messages.created_at', 'desc')
    .limit(200)
    .execute();
}

export async function markMessageRead(id: number, read: boolean) {
  const r = await getDb()
    .updateTable('contact_messages')
    .set({ read_at: read ? nowIso() : null })
    .where('id', '=', id)
    .executeTakeFirst();
  if (Number(r.numUpdatedRows) === 0) throw new HttpError('bulunamadi', 'Mesaj bulunamadı.');
}

export async function deleteMessage(id: number) {
  const r = await getDb().deleteFrom('contact_messages').where('id', '=', id).executeTakeFirst();
  if (Number(r.numDeletedRows) === 0) throw new HttpError('bulunamadi', 'Mesaj bulunamadı.');
}

/** KVKK saklama süresi: 180 günden eski iletişim mesajları ve eski hız sınırı kayıtları silinir. */
export async function purgeOldMessages(now = new Date()) {
  const db = getDb();
  const cutoff = new Date(now.getTime() - CONTACT_RETENTION_DAYS * 86_400_000).toISOString();
  const r = await db
    .deleteFrom('contact_messages')
    .where('created_at', '<', cutoff)
    .executeTakeFirst();
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  await db.deleteFrom('rate_events').where('created_at', '<', dayAgo).execute();
  return Number(r.numDeletedRows);
}
