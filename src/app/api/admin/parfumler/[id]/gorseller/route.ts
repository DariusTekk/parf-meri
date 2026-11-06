import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { HttpError, apiOk, handle } from '@/lib/server/http';
import { addImage, listImages, reorderImages } from '@/lib/server/images';
import { requireAdminApi } from '@/lib/server/request';
import { parseId, parseJson } from '@/lib/server/route-helpers';
import { IMAGE_LIMITS } from '@/lib/shared/domain';
import { imageOrderSchema } from '@/lib/shared/schemas';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const id = parseId((await ctx.params).id);
  const rawLength = request.headers.get('content-length');
  const length = Number(rawLength);
  if (rawLength === null || !Number.isFinite(length)) {
    throw new HttpError(
      'gecersiz',
      'Yükleme boyutu belirtilmedi. Sayfayı yenileyip tekrar deneyin.',
    );
  }
  if (length > IMAGE_LIMITS.maxBytes + 64 * 1024) {
    throw new HttpError('cok_buyuk', 'Dosya 5 MB sınırını aşıyor. Daha küçük bir görsel seçin.');
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(
      'gecersiz',
      'Yükleme okunamadı. Bağlantı kesilmiş olabilir; tekrar deneyin.',
    );
  }
  const file = form.get('dosya');
  if (!(file instanceof File)) throw new HttpError('gecersiz', 'Yüklenecek dosya bulunamadı.');
  if (file.size > IMAGE_LIMITS.maxBytes) {
    throw new HttpError('cok_buyuk', 'Dosya 5 MB sınırını aşıyor. Daha küçük bir görsel seçin.');
  }
  const alt = typeof form.get('alt') === 'string' ? String(form.get('alt')).slice(0, 200) : '';
  const buf = Buffer.from(await file.arrayBuffer());
  const { id: imageId } = await addImage(id, buf, file.type, alt);
  await audit(admin.id, 'gorsel_ekle', 'parfum', id, 'Görsel eklendi');
  const images = await listImages(id);
  return apiOk({ id: imageId, images }, 201);
});

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const id = parseId((await ctx.params).id);
  const { order } = await parseJson(request, imageOrderSchema);
  await reorderImages(id, order);
  await audit(admin.id, 'gorsel_sirala', 'parfum', id, 'Görsellerin sırası değiştirildi');
  return apiOk({ images: await listImages(id) });
});
