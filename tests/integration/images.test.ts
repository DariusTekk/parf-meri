import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { HttpError } from '@/lib/server/http';
import {
  addImage,
  cleanupOrphans,
  deleteImage,
  detectImageType,
  imageFilePath,
  listImages,
  reorderImages,
  updateImage,
  uploadRoot,
} from '@/lib/server/images';
import { savePerfume } from '@/lib/server/perfumes';
import { freshDb, makeBrand, perfumeInput, pngBuffer, publishedPerfume } from './helpers';

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'basarili';
  } catch (e) {
    return e instanceof HttpError ? e.code : 'beklenmeyen';
  }
}

const dirs = () =>
  fs.existsSync(uploadRoot()) ? fs.readdirSync(uploadRoot()).filter((d) => d !== 'tmp') : [];
const tmpDirs = () =>
  fs.existsSync(path.join(uploadRoot(), 'tmp'))
    ? fs.readdirSync(path.join(uploadRoot(), 'tmp'))
    : [];

describe('Görsel yükleme ve işleme', () => {
  let perfumeId: number;
  beforeEach(async () => {
    await freshDb();
    fs.rmSync(uploadRoot(), { recursive: true, force: true });
    const brand = await makeBrand('Görsel Marka');
    perfumeId = (await savePerfume(perfumeInput({ brandId: brand }))).id;
  });

  it('dosya imzasını tanır', async () => {
    expect(detectImageType(await pngBuffer())).toBe('png');
    expect(
      detectImageType(
        await sharp(await pngBuffer())
          .jpeg()
          .toBuffer(),
      ),
    ).toBe('jpeg');
    expect(
      detectImageType(
        await sharp(await pngBuffer())
          .webp()
          .toBuffer(),
      ),
    ).toBe('webp');
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull();
  });

  it('sahte uzantılı (içeriği metin olan) dosyayı reddeder', async () => {
    const fake = Buffer.from('<html><script>alert(1)</script></html>');
    expect(await code(addImage(perfumeId, fake, 'image/jpeg'))).toBe('desteklenmeyen_tur');
    expect(dirs()).toHaveLength(0);
  });

  it('içeriği PNG olup JPEG olarak bildirilen dosyayı reddeder', async () => {
    expect(await code(addImage(perfumeId, await pngBuffer(), 'image/jpeg'))).toBe(
      'desteklenmeyen_tur',
    );
  });

  it('5 MB üstü dosyayı reddeder', async () => {
    const big = Buffer.concat([await pngBuffer(), Buffer.alloc(5 * 1024 * 1024)]);
    expect(await code(addImage(perfumeId, big, 'image/png'))).toBe('cok_buyuk');
  });

  it('çok küçük görseli reddeder', async () => {
    expect(await code(addImage(perfumeId, await pngBuffer(100, 100), 'image/png'))).toBe(
      'gecersiz',
    );
  });

  it('400/800/1600 genişlikte WebP ve AVIF üretir, büyütme yapmaz', async () => {
    const { id } = await addImage(perfumeId, await pngBuffer(2000, 2500), 'image/png', 'Şişe');
    const files = fs.readdirSync(path.join(uploadRoot(), id)).sort();
    expect(files).toEqual([
      '1600.avif',
      '1600.webp',
      '400.avif',
      '400.webp',
      '800.avif',
      '800.webp',
    ]);
    const meta = await sharp(path.join(uploadRoot(), id, '1600.webp')).metadata();
    expect(meta.width).toBe(1600);
    const small = await addImage(perfumeId, await pngBuffer(600, 750), 'image/png');
    expect(fs.readdirSync(path.join(uploadRoot(), small.id)).sort()).toEqual([
      '400.avif',
      '400.webp',
      '600.avif',
      '600.webp',
    ]);
  });

  it('EXIF ve konum (GPS) verisini siler', async () => {
    const withExif = await sharp(await pngBuffer())
      .jpeg()
      .withExif({
        IFD0: { Make: 'DenemeKamera', Copyright: 'x' },
        IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '41/1 0/1 0/1' },
      })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const { id } = await addImage(perfumeId, withExif, 'image/jpeg', 'Şişe');
    for (const file of fs.readdirSync(path.join(uploadRoot(), id))) {
      const meta = await sharp(path.join(uploadRoot(), id, file)).metadata();
      expect(meta.exif, file).toBeUndefined();
    }
  });

  it('dokuzuncu görseli reddeder', async () => {
    const png = await pngBuffer();
    for (let i = 0; i < 8; i += 1) await addImage(perfumeId, png, 'image/png', `G${i}`);
    expect(await code(addImage(perfumeId, png, 'image/png'))).toBe('gecersiz');
    expect(await listImages(perfumeId)).toHaveLength(8);
  });

  it('eşzamanlı yüklemede sınır aşılırsa kaydı başarısız olan yüklemenin dosyaları silinir', async () => {
    const png = await pngBuffer();
    for (let i = 0; i < 7; i += 1) await addImage(perfumeId, png, 'image/png', `G${i}`);
    const results = await Promise.all([
      code(addImage(perfumeId, png, 'image/png')),
      code(addImage(perfumeId, png, 'image/png')),
    ]);
    expect(results.sort()).toEqual(['basarili', 'gecersiz']);
    expect(await listImages(perfumeId)).toHaveLength(8);
    expect(dirs()).toHaveLength(8);
    expect(tmpDirs()).toHaveLength(0);
  });

  it('yarıda kalmış yükleme ve kaydı olmayan klasörleri temizler', async () => {
    const { id } = await addImage(perfumeId, await pngBuffer(), 'image/png', 'Kalacak');
    const orphan = path.join(uploadRoot(), '11111111-1111-4111-8111-111111111111');
    const tmp = path.join(uploadRoot(), 'tmp', '22222222-2222-4222-8222-222222222222');
    fs.mkdirSync(orphan, { recursive: true });
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, '400.webp'), 'yarim');
    expect(await cleanupOrphans(60_000)).toEqual({ removedTmp: 0, removedOrphans: 0 });
    const r = await cleanupOrphans(60_000, Date.now() + 120_000);
    expect(r).toEqual({ removedTmp: 1, removedOrphans: 1 });
    expect(fs.existsSync(orphan)).toBe(false);
    expect(fs.existsSync(path.join(uploadRoot(), id))).toBe(true);
  });

  it('yol geçişi denemelerini reddeder', () => {
    const id = '33333333-3333-4333-8333-333333333333';
    expect(imageFilePath(id, '400.webp')).toBe(
      path.join(path.resolve(uploadRoot()), id, '400.webp'),
    );
    for (const [a, b] of [
      ['..', '400.webp'],
      ['../../etc', 'passwd'],
      [id, '../400.webp'],
      [id, '..%2F..%2Fapp.sqlite'],
      [id, '400.webp/../../x'],
      [id, '400.png'],
      ['tmp', '400.webp'],
    ] as const) {
      expect(imageFilePath(a, b), `${a}/${b}`).toBeNull();
    }
  });

  it('sıralama, kapak seçimi ve silme', async () => {
    const png = await pngBuffer();
    const a = await addImage(perfumeId, png, 'image/png', 'A');
    const b = await addImage(perfumeId, png, 'image/png', 'B');
    const c = await addImage(perfumeId, png, 'image/png', 'C');
    await reorderImages(perfumeId, [c.id, a.id, b.id]);
    expect((await listImages(perfumeId)).map((i) => i.alt_text)).toEqual(['C', 'A', 'B']);
    await updateImage(perfumeId, b.id, { isCover: true });
    expect((await listImages(perfumeId)).filter((i) => i.is_cover === 1).map((i) => i.id)).toEqual([
      b.id,
    ]);
    expect(await code(reorderImages(perfumeId, [a.id, b.id]))).toBe('gecersiz');
    await deleteImage(perfumeId, a.id);
    expect(fs.existsSync(path.join(uploadRoot(), a.id))).toBe(false);
    expect(await listImages(perfumeId)).toHaveLength(2);
  });

  it('yayındaki parfümün son görseli silinemez', async () => {
    const brand = await makeBrand('Başka');
    const p = await publishedPerfume(brand, { name: 'Yayında' });
    const [img] = await listImages(p.id);
    expect(await code(deleteImage(p.id, img!.id))).toBe('gecersiz');
  });
});
