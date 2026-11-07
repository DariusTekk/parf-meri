import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { getDb } from './db';
import { getEnv } from './env';
import { HttpError } from './http';
import { getImageStorage, type StoredFile } from './storage';
import { IMAGE_LIMITS } from '@/lib/shared/domain';
import { nowIso } from '@/lib/shared/format';

// sharp'ın dosya önbelleği Windows'ta dosyaları açık tutup silmeyi engeller; yüklemeler
// tek seferlik işlendiği için önbellek kapalı.
sharp.cache(false);

export type DetectedType = 'jpeg' | 'png' | 'webp';

/** Dosya imzasına (magic bytes) göre tür tespiti; uzantı ve bildirilen MIME'a güvenilmez. */
export function detectImageType(buf: Uint8Array): DetectedType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

const ALLOWED_MIME: Record<DetectedType, string[]> = {
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
};

export const IMAGE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const IMAGE_FILE_PATTERN = /^(\d{3,4})\.(webp|avif)$/;

export function uploadRoot(): string {
  return getEnv().uploadDir;
}

/** Yol geçişine karşı: yalnızca UUID ve izinli dosya adı kalıbı kabul edilir. */
export function imageFilePath(id: string, file: string): string | null {
  if (!IMAGE_ID_PATTERN.test(id) || !IMAGE_FILE_PATTERN.test(file)) return null;
  const root = path.resolve(uploadRoot());
  const full = path.resolve(root, id, file);
  if (!full.startsWith(root + path.sep)) return null;
  return full;
}

export type ProcessedImage = { width: number; height: number; widths: number[] };

export async function validateAndDescribe(buf: Buffer, declaredMime: string) {
  if (buf.length === 0) throw new HttpError('gecersiz', 'Dosya boş.');
  if (buf.length > IMAGE_LIMITS.maxBytes) {
    throw new HttpError('cok_buyuk', 'Dosya 5 MB sınırını aşıyor. Daha küçük bir görsel seçin.');
  }
  const type = detectImageType(buf);
  if (!type) {
    throw new HttpError(
      'desteklenmeyen_tur',
      'Yalnızca JPEG, PNG ve WebP görseller yüklenebilir. Dosyanın içeriği bu türlerden biri değil.',
    );
  }
  if (declaredMime && !ALLOWED_MIME[type].includes(declaredMime.toLowerCase())) {
    throw new HttpError(
      'desteklenmeyen_tur',
      'Dosyanın türü ile içeriği uyuşmuyor. Dosya uzantısı değiştirilmiş olabilir.',
    );
  }
  let meta: Metadata;
  try {
    meta = await sharp(buf, {
      limitInputPixels: IMAGE_LIMITS.maxPixels,
      failOn: 'error',
    }).metadata();
  } catch {
    throw new HttpError('gecersiz', 'Görsel okunamadı. Dosya bozuk olabilir.');
  }
  if (meta.format !== type) {
    throw new HttpError(
      'desteklenmeyen_tur',
      'Dosyanın içeriği beklenen görsel türüyle uyuşmuyor.',
    );
  }
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = (rotated ? meta.height : meta.width) ?? 0;
  const height = (rotated ? meta.width : meta.height) ?? 0;
  if (width < IMAGE_LIMITS.minSide || height < IMAGE_LIMITS.minSide) {
    throw new HttpError(
      'gecersiz',
      `Görsel en az ${IMAGE_LIMITS.minSide}×${IMAGE_LIMITS.minSide} piksel olmalıdır.`,
    );
  }
  if (width * height > IMAGE_LIMITS.maxPixels) {
    throw new HttpError('cok_buyuk', 'Görselin çözünürlüğü çok yüksek.');
  }
  return { type, width, height };
}

/** Görseli 400/800/1600 px genişliklerde WebP ve AVIF olarak üretir; tüm meta veriler silinir. */
export async function renderVariants(
  buf: Buffer,
  originalWidth: number,
): Promise<{ widths: number[]; files: StoredFile[] }> {
  const targets = IMAGE_LIMITS.widths.filter((w) => w < originalWidth) as number[];
  const top = Math.min(originalWidth, IMAGE_LIMITS.widths[IMAGE_LIMITS.widths.length - 1] ?? 1600);
  if (!targets.includes(top)) targets.push(top);
  const widths = [...new Set(targets)].sort((a, b) => a - b);
  const files: StoredFile[] = [];
  for (const w of widths) {
    const base = sharp(buf, { limitInputPixels: IMAGE_LIMITS.maxPixels })
      .rotate()
      .resize({ width: w, withoutEnlargement: true });
    files.push({
      name: `${w}.webp`,
      data: await base.clone().webp({ quality: 78 }).toBuffer(),
      contentType: 'image/webp',
    });
    files.push({
      name: `${w}.avif`,
      data: await base.clone().avif({ quality: 52, effort: 4 }).toBuffer(),
      contentType: 'image/avif',
    });
  }
  return { widths, files };
}

export async function addImage(
  perfumeId: number,
  buf: Buffer,
  declaredMime: string,
  altText = '',
): Promise<{ id: string }> {
  const db = getDb();
  const perfume = await db
    .selectFrom('perfumes')
    .select('id')
    .where('id', '=', perfumeId)
    .executeTakeFirst();
  if (!perfume) throw new HttpError('bulunamadi', 'Parfüm bulunamadı.');
  const count = await countImages(perfumeId);
  if (count >= IMAGE_LIMITS.maxPerPerfume) {
    throw new HttpError(
      'gecersiz',
      `Bir parfüme en fazla ${IMAGE_LIMITS.maxPerPerfume} görsel eklenebilir.`,
    );
  }
  const info = await validateAndDescribe(buf, declaredMime);

  const id = randomUUID();
  const storage = getImageStorage();
  try {
    const { widths, files } = await renderVariants(buf, info.width);
    const largest = widths[widths.length - 1] ?? info.width;
    const height = Math.round((info.height * largest) / info.width);
    // Önce dosyalar, sonra kayıt: kayıt başarısız olursa dosyalar aşağıda silinir.
    await storage.write(id, files);
    await insertImageRow(perfumeId, id, altText, largest, height, widths);
    return { id };
  } catch (error) {
    await storage.remove(id);
    await db.deleteFrom('perfume_images').where('id', '=', id).execute();
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && error.message.includes('image_limit')) {
      throw new HttpError(
        'gecersiz',
        `Bir parfüme en fazla ${IMAGE_LIMITS.maxPerPerfume} görsel eklenebilir.`,
      );
    }
    throw error;
  }
}

export async function insertImageRow(
  perfumeId: number,
  id: string,
  altText: string,
  width: number,
  height: number,
  widths: number[],
) {
  const db = getDb();
  const count = await countImages(perfumeId);
  await db
    .insertInto('perfume_images')
    .values({
      id,
      perfume_id: perfumeId,
      sort_order: count,
      is_cover: count === 0 ? 1 : 0,
      alt_text: altText.trim(),
      width,
      height,
      widths: widths.join(','),
      created_at: nowIso(),
    })
    .execute();
}

async function countImages(perfumeId: number): Promise<number> {
  const row = await getDb()
    .selectFrom('perfume_images')
    .select((eb) => eb.fn.countAll<number>().as('n'))
    .where('perfume_id', '=', perfumeId)
    .executeTakeFirstOrThrow();
  return Number(row.n);
}

export async function listImages(perfumeId: number) {
  return getDb()
    .selectFrom('perfume_images')
    .select(['id', 'alt_text', 'width', 'height', 'widths', 'is_cover', 'sort_order'])
    .where('perfume_id', '=', perfumeId)
    .orderBy('sort_order')
    .execute();
}

export async function updateImage(
  perfumeId: number,
  imageId: string,
  patch: { altText?: string; isCover?: true },
) {
  const db = getDb();
  const img = await db
    .selectFrom('perfume_images')
    .select('id')
    .where('id', '=', imageId)
    .where('perfume_id', '=', perfumeId)
    .executeTakeFirst();
  if (!img) throw new HttpError('bulunamadi', 'Görsel bulunamadı.');
  await db.transaction().execute(async (trx) => {
    if (patch.altText !== undefined) {
      await trx
        .updateTable('perfume_images')
        .set({ alt_text: patch.altText.trim() })
        .where('id', '=', imageId)
        .execute();
    }
    if (patch.isCover) {
      await trx
        .updateTable('perfume_images')
        .set({ is_cover: 0 })
        .where('perfume_id', '=', perfumeId)
        .execute();
      await trx
        .updateTable('perfume_images')
        .set({ is_cover: 1 })
        .where('id', '=', imageId)
        .execute();
    }
  });
}

export async function reorderImages(perfumeId: number, order: string[]) {
  const db = getDb();
  const current = await listImages(perfumeId);
  const ids = new Set(current.map((i) => i.id));
  if (
    order.length !== current.length ||
    !order.every((id) => ids.has(id)) ||
    new Set(order).size !== order.length
  ) {
    throw new HttpError(
      'gecersiz',
      'Sıralama listesi parfümün görselleriyle uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    );
  }
  await db.transaction().execute(async (trx) => {
    for (const [index, id] of order.entries()) {
      await trx
        .updateTable('perfume_images')
        .set({ sort_order: index })
        .where('id', '=', id)
        .execute();
    }
  });
}

export async function deleteImage(perfumeId: number, imageId: string) {
  const db = getDb();
  const img = await db
    .selectFrom('perfume_images')
    .select(['id', 'is_cover'])
    .where('id', '=', imageId)
    .where('perfume_id', '=', perfumeId)
    .executeTakeFirst();
  if (!img) throw new HttpError('bulunamadi', 'Görsel bulunamadı.');
  const perfume = await db
    .selectFrom('perfumes')
    .select(['status', 'deleted_at'])
    .where('id', '=', perfumeId)
    .executeTakeFirstOrThrow();
  const remaining = (await listImages(perfumeId)).filter((i) => i.id !== imageId);
  if (perfume.status === 'published' && !perfume.deleted_at && remaining.length === 0) {
    throw new HttpError(
      'gecersiz',
      'Yayındaki bir parfümün son görseli silinemez. Önce yeni görsel ekleyin ya da parfümü taslağa alın.',
    );
  }
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('perfume_images').where('id', '=', imageId).execute();
    for (const [index, r] of remaining.entries()) {
      await trx
        .updateTable('perfume_images')
        .set({ sort_order: index, ...(img.is_cover === 1 && index === 0 ? { is_cover: 1 } : {}) })
        .where('id', '=', r.id)
        .execute();
    }
  });
  await getImageStorage().remove(imageId);
}

/** /gorsel rotası için: yalnızca UUID ve izinli dosya adı kalıbıyla depodan okur. */
export async function readImageFile(id: string, file: string): Promise<Buffer | null> {
  if (!IMAGE_ID_PATTERN.test(id) || !IMAGE_FILE_PATTERN.test(file)) return null;
  return getImageStorage().read(id, file);
}

/**
 * Yetim dosya temizliği: yarıda kalan yüklemelerin geçici klasörleri ve veritabanında
 * karşılığı olmayan görsel klasörleri, belirtilen süreden eskiyse silinir.
 */
export async function cleanupOrphans(olderThanMs = 60 * 60 * 1000, now = Date.now()) {
  const storage = getImageStorage();
  let removedTmp = 0;
  let removedOrphans = 0;
  const known = new Set(
    (await getDb().selectFrom('perfume_images').select('id').execute()).map((r) => r.id),
  );
  for (const { id, modifiedAt } of await storage.listIds()) {
    if (now - modifiedAt <= olderThanMs) continue;
    if (id.startsWith('tmp/')) {
      // Yalnızca yerel diskte: yarıda kalmış yazmanın geçici klasörü.
      await fs.rm(path.join(uploadRoot(), id), { recursive: true, force: true });
      removedTmp += 1;
    } else if (IMAGE_ID_PATTERN.test(id) && !known.has(id)) {
      await storage.remove(id);
      removedOrphans += 1;
    }
  }
  return { removedTmp, removedOrphans };
}

export type ImageAccess = 'public' | 'admin-only' | 'missing';

/** Görsel adresinin kime açık olduğunu belirler: yalnızca yayındaki ve silinmemiş parfümler herkese açık. */
export async function imageAccess(
  imageId: string,
): Promise<{ access: ImageAccess; widths: number[] }> {
  const row = await getDb()
    .selectFrom('perfume_images')
    .innerJoin('perfumes', 'perfumes.id', 'perfume_images.perfume_id')
    .select(['perfumes.status', 'perfumes.deleted_at', 'perfume_images.widths'])
    .where('perfume_images.id', '=', imageId)
    .executeTakeFirst();
  if (!row) return { access: 'missing', widths: [] };
  const widths = row.widths.split(',').map(Number);
  if (row.status === 'published' && row.deleted_at === null) return { access: 'public', widths };
  return { access: 'admin-only', widths };
}
