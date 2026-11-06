import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, queryCount } from '@/lib/server/db';
import { HttpError } from '@/lib/server/http';
import { addImage, updateImage, listImages } from '@/lib/server/images';
import {
  catalogFacets,
  dashboardStats,
  getPerfumeForAdmin,
  listForAdmin,
  listPublished,
  restorePerfume,
  savePerfume,
  setStatusBulk,
  softDeletePerfume,
} from '@/lib/server/perfumes';
import { deleteTaxonomy, renameTaxonomy } from '@/lib/server/taxonomy';
import { freshDb, makeBrand, perfumeInput, pngBuffer, publishedPerfume } from './helpers';

async function expectHttp(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(HttpError);
  await promise.catch((e: HttpError) => expect(e.code).toBe(code));
}

describe('Parfüm kaydı', () => {
  let brand: number;
  beforeEach(async () => {
    await freshDb();
    brand = await makeBrand('Ana Marka');
  });

  it('slug addan üretilir ve çakışmada numaralanır', async () => {
    const a = await savePerfume(perfumeInput({ brandId: brand, name: 'Gece Kehribarı' }));
    const b = await savePerfume(perfumeInput({ brandId: brand, name: 'Gece Kehribarı' }));
    expect(a.slug).toBe('gece-kehribari');
    expect(b.slug).toBe('gece-kehribari-2');
  });

  it('elle verilen slug başka kayıtta varsa alan hatası verir', async () => {
    await savePerfume(perfumeInput({ brandId: brand, name: 'Bir', slug: 'ayni' }));
    await expectHttp(
      savePerfume(perfumeInput({ brandId: brand, name: 'İki', slug: 'ayni' })),
      'gecersiz',
    );
  });

  it('eşzamanlı düzenlemede eski updated_at ile kaydeden 409 alır ve veri korunur', async () => {
    const created = await savePerfume(perfumeInput({ brandId: brand, name: 'Çakışma' }));
    const tabA = created.updatedAt;
    const tabB = created.updatedAt;
    await savePerfume(perfumeInput({ brandId: brand, name: 'A sekmesi' }), {
      id: created.id,
      expectedUpdatedAt: tabA,
    });
    await expectHttp(
      savePerfume(perfumeInput({ brandId: brand, name: 'B sekmesi' }), {
        id: created.id,
        expectedUpdatedAt: tabB,
      }),
      'cakisma',
    );
    expect((await getPerfumeForAdmin(created.id))?.name).toBe('A sekmesi');
  });

  it('görselsiz ya da alternatif metni boş görselli parfüm yayınlanamaz', async () => {
    const p = await savePerfume(perfumeInput({ brandId: brand }));
    await expectHttp(
      savePerfume(perfumeInput({ brandId: brand, status: 'published' }), { id: p.id }),
      'gecersiz',
    );
    const img = await addImage(p.id, await pngBuffer(), 'image/png', '');
    await expectHttp(
      savePerfume(perfumeInput({ brandId: brand, status: 'published' }), { id: p.id }),
      'gecersiz',
    );
    await updateImage(p.id, img.id, { altText: 'Şişe' });
    const ok = await savePerfume(
      perfumeInput({ brandId: brand, slug: p.slug, status: 'published' }),
      { id: p.id },
    );
    expect(ok.id).toBe(p.id);
  });

  it('notalar adla eşlenir, yoksa oluşturulur; varyantlardan en düşük fiyat hesaplanır', async () => {
    const p = await savePerfume(
      perfumeInput({
        brandId: brand,
        notes: { top: ['Bergamot', 'bergamot'], heart: ['Gül'], base: [] },
        variants: [
          { volumeMl: 50, priceKurus: 200000 },
          { volumeMl: 100, priceKurus: 150000 },
          { volumeMl: 10, priceKurus: null },
        ],
      }),
    );
    const d = await getPerfumeForAdmin(p.id);
    expect(d?.notes.top.map((n) => n.name)).toEqual(['Bergamot']);
    expect(d?.minPriceKurus).toBe(150000);
    expect(d?.variants).toHaveLength(3);
  });

  it('fiyatsız parfümde en düşük fiyat null kalır', async () => {
    const p = await savePerfume(
      perfumeInput({ brandId: brand, variants: [{ volumeMl: 50, priceKurus: null }] }),
    );
    expect((await getPerfumeForAdmin(p.id))?.minPriceKurus).toBeNull();
  });

  it('silme geri alınabilir', async () => {
    const p = await publishedPerfume(brand, { name: 'Geri Gelen' });
    await softDeletePerfume(p.id);
    expect((await listPublished({})).total).toBe(0);
    expect((await listForAdmin({ durum: 'silinen' })).total).toBe(1);
    await restorePerfume(p.id);
    expect((await listPublished({})).total).toBe(1);
    await expectHttp(restorePerfume(p.id), 'bulunamadi');
  });

  it('toplu yayından kaldırma ve uygun olmayanları atlayan toplu yayınlama', async () => {
    const a = await publishedPerfume(brand, { name: 'A' });
    const b = await savePerfume(perfumeInput({ brandId: brand, name: 'B' }));
    const off = await setStatusBulk([a.id], 'draft');
    expect(off.changed).toEqual([a.id]);
    const on = await setStatusBulk([a.id, b.id], 'published');
    expect(on.changed).toEqual([a.id]);
    expect(on.skipped.map((s) => s.id)).toEqual([b.id]);
  });

  it('Türkçe arama: İstanbul/istanbul ve çiçek/cicek aynı sonucu verir', async () => {
    await publishedPerfume(brand, { name: 'İstanbul Çiçeği' });
    for (const q of [
      'istanbul',
      'İSTANBUL',
      'Istanbul',
      'ISTANBUL',
      'cicegi',
      'çiçeği',
      'ÇİÇEĞİ',
      'İstanbul çiçeği',
    ]) {
      expect((await listPublished({ q })).total, q).toBe(1);
    }
    // Joker karakterler arama sözcüğünden ayıklanır; "%" tek başına filtre oluşturmaz.
    expect((await listPublished({ q: 'zz%' })).total).toBe(0);
  });

  it('marka adı değişince arama metni güncellenir; kullanılan marka silinemez', async () => {
    await publishedPerfume(brand, { name: 'Parfüm' });
    await renameTaxonomy('brand', brand, 'Yepyeni Ad');
    expect((await listPublished({ q: 'yepyeni' })).total).toBe(1);
    await expectHttp(deleteTaxonomy('brand', brand), 'cakisma');
  });

  it('filtreler, fiyat aralığı, sıralama ve sayfalama', async () => {
    for (let i = 0; i < 26; i += 1) {
      await publishedPerfume(brand, {
        name: `Seri ${i}`,
        concentration: i % 2 ? 'EDT' : 'EDP',
        variants: [{ volumeMl: 50, priceKurus: (i + 1) * 10000 }],
        notes: { top: i < 3 ? ['Safran'] : [], heart: [], base: [] },
      });
    }
    const page1 = await listPublished({ sirala: 'fiyat-artan' });
    expect(page1.total).toBe(26);
    expect(page1.items).toHaveLength(24);
    expect(page1.pageCount).toBe(2);
    expect(page1.items[0]?.minPriceKurus).toBe(10000);
    const page2 = await listPublished({ sirala: 'fiyat-artan', sayfa: 2 });
    expect(page2.items).toHaveLength(2);
    expect((await listPublished({ konsantrasyon: 'EDT' })).total).toBe(13);
    expect((await listPublished({ min: 100, max: 600 })).total).toBe(6);
    expect((await listPublished({ nota: 'safran' })).total).toBe(3);
    expect((await listPublished({ sayfa: 99 })).page).toBe(2);
    expect((await listPublished({ sirala: 'fiyat-azalan' })).items[0]?.minPriceKurus).toBe(260000);
  });

  it('katalog ilk ekranı N+1 olmadan sabit sayıda sorguyla yüklenir', async () => {
    for (let i = 0; i < 10; i += 1)
      await publishedPerfume(brand, {
        name: `Sorgu ${i}`,
        notes: { top: ['A'], heart: [], base: [] },
      });
    const before = queryCount();
    await Promise.all([listPublished({}), catalogFacets()]);
    const used = queryCount() - before;
    expect(used).toBeLessThanOrEqual(3);
  });

  it('pano sayıları eksik görsel ve alternatif metni raporlar', async () => {
    const p = await savePerfume(perfumeInput({ brandId: brand }));
    await savePerfume(perfumeInput({ brandId: brand, name: 'Görselsiz' }));
    await addImage(p.id, await pngBuffer(), 'image/png', '');
    const s = await dashboardStats();
    expect(s.draft).toBe(2);
    expect(s.noImage).toBe(1);
    expect(s.missingAlt).toBe(1);
    expect(await listImages(p.id)).toHaveLength(1);
    expect(await getDb().selectFrom('perfumes').select('id').execute()).toHaveLength(2);
  });
});
