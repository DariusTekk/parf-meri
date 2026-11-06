import { beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '@/lib/server/db';
import { addImage, imageAccess } from '@/lib/server/images';
import {
  brandWithPublished,
  brandsForSitemap,
  catalogFacets,
  featuredPerfumes,
  getPublishedBySlug,
  listPublished,
  newestPerfumes,
  publishedCardsBySlugs,
  publishedForSitemap,
  savePerfume,
  similarPerfumes,
  softDeletePerfume,
} from '@/lib/server/perfumes';
import { freshDb, makeBrand, perfumeInput, pngBuffer, publishedPerfume } from './helpers';

/**
 * Ziyaretçiye görünürlük: taslak ve silinmiş kayıt hiçbir herkese açık sorguda,
 * sitemap'te ve görsel erişiminde görünmez.
 */
describe('Herkese açık görünürlük', () => {
  let visible: { id: number; slug: string };
  let draft: { id: number; slug: string };
  let deleted: { id: number; slug: string };
  let draftBrandSlug: string;
  let draftImageId: string;
  let deletedImageId: string;
  let visibleImageId: string;

  beforeAll(async () => {
    await freshDb();
    const brand = await makeBrand('Görünür Marka');
    const hiddenBrand = await makeBrand('Gizli Marka');
    const shared = {
      familyId: null,
      notes: { top: ['Bergamot'], heart: ['Gül'], base: ['Misk'] },
      isFeatured: true,
    };
    visible = await publishedPerfume(brand, { name: 'Görünür', ...shared });
    deleted = await publishedPerfume(brand, { name: 'Silinecek', ...shared });
    await softDeletePerfume(deleted.id);
    draft = await savePerfume(
      perfumeInput({ brandId: hiddenBrand, name: 'Taslak Gizli', ...shared }),
    );
    draftImageId = (await addImage(draft.id, await pngBuffer(), 'image/png', 'taslak')).id;
    const imgs = await getDb().selectFrom('perfume_images').select(['id', 'perfume_id']).execute();
    deletedImageId = imgs.find((i) => i.perfume_id === deleted.id)!.id;
    visibleImageId = imgs.find((i) => i.perfume_id === visible.id)!.id;
    draftBrandSlug = (
      await getDb()
        .selectFrom('brands')
        .select('slug')
        .where('id', '=', hiddenBrand)
        .executeTakeFirstOrThrow()
    ).slug;
  });

  it('katalog yalnızca yayındaki parfümü listeler', async () => {
    const r = await listPublished({});
    expect(r.items.map((i) => i.slug)).toEqual([visible.slug]);
    expect(r.total).toBe(1);
    const search = await listPublished({ q: 'gizli' });
    expect(search.total).toBe(0);
  });

  it('ürün detayı taslak ve silinmiş için null döner', async () => {
    expect(await getPublishedBySlug(visible.slug)).not.toBeNull();
    expect(await getPublishedBySlug(draft.slug)).toBeNull();
    expect(await getPublishedBySlug(deleted.slug)).toBeNull();
  });

  it('öne çıkanlar, yeni gelenler ve favori API sorguları gizli kayıt döndürmez', async () => {
    for (const list of [
      await featuredPerfumes(),
      await newestPerfumes(),
      await publishedCardsBySlugs([visible.slug, draft.slug, deleted.slug]),
    ]) {
      expect(list.map((p) => p.slug)).toEqual([visible.slug]);
    }
  });

  it('benzer parfümler gizli kayıt döndürmez', async () => {
    const detail = await getPublishedBySlug(visible.slug);
    const similar = await similarPerfumes(detail!);
    expect(similar.map((p) => p.slug)).not.toContain(draft.slug);
    expect(similar.map((p) => p.slug)).not.toContain(deleted.slug);
  });

  it('filtre seçenekleri yalnızca yayındaki parfümlerin marka ve notalarını içerir', async () => {
    const f = await catalogFacets();
    expect(f.brand.map((b) => b.name)).toEqual(['Görünür Marka']);
  });

  it('sitemap yalnızca yayındaki parfümü ve markasını içerir', async () => {
    expect((await publishedForSitemap()).map((p) => p.slug)).toEqual([visible.slug]);
    expect((await brandsForSitemap()).map((b) => b.slug)).not.toContain(draftBrandSlug);
  });

  it('yalnızca taslak ürünü olan markanın sayfası boş liste döner', async () => {
    const r = await brandWithPublished(draftBrandSlug);
    expect(r?.perfumes).toEqual([]);
  });

  it('taslak ve silinmiş parfümün görseli yalnızca yöneticiye açıktır', async () => {
    expect((await imageAccess(visibleImageId)).access).toBe('public');
    expect((await imageAccess(draftImageId)).access).toBe('admin-only');
    expect((await imageAccess(deletedImageId)).access).toBe('admin-only');
    expect((await imageAccess('00000000-0000-4000-8000-000000000000')).access).toBe('missing');
  });
});
