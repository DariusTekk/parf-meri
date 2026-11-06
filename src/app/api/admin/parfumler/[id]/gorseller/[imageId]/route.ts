import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { HttpError, apiOk, handle } from '@/lib/server/http';
import { IMAGE_ID_PATTERN, deleteImage, listImages, updateImage } from '@/lib/server/images';
import { requireAdminApi } from '@/lib/server/request';
import { parseId, parseJson } from '@/lib/server/route-helpers';
import { imagePatchSchema } from '@/lib/shared/schemas';

type Ctx = { params: Promise<{ id: string; imageId: string }> };

async function ids(ctx: Ctx) {
  const p = await ctx.params;
  if (!IMAGE_ID_PATTERN.test(p.imageId)) throw new HttpError('bulunamadi', 'Görsel bulunamadı.');
  return { id: parseId(p.id), imageId: p.imageId };
}

export const PATCH = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const { id, imageId } = await ids(ctx);
  const patch = await parseJson(request, imagePatchSchema);
  await updateImage(id, imageId, patch);
  await audit(
    admin.id,
    'gorsel_guncelle',
    'parfum',
    id,
    patch.isCover ? 'Kapak görseli değiştirildi' : 'Görsel alternatif metni güncellendi',
  );
  return apiOk({ images: await listImages(id) });
});

export const DELETE = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const { id, imageId } = await ids(ctx);
  await deleteImage(id, imageId);
  await audit(admin.id, 'gorsel_sil', 'parfum', id, 'Görsel silindi');
  return apiOk({ images: await listImages(id) });
});
