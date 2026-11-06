import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { savePerfume, softDeletePerfume } from '@/lib/server/perfumes';
import { requireAdminApi } from '@/lib/server/request';
import { parseId, parseJson } from '@/lib/server/route-helpers';
import { STATUS_LABELS } from '@/lib/shared/domain';
import { perfumeUpdateSchema } from '@/lib/shared/schemas';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const id = parseId((await ctx.params).id);
  const { updatedAt, ...input } = await parseJson(request, perfumeUpdateSchema);
  const saved = await savePerfume(input, { id, expectedUpdatedAt: updatedAt });
  await audit(
    admin.id,
    'guncelle',
    'parfum',
    id,
    `Parfüm güncellendi (${STATUS_LABELS[input.status]}): ${input.name}`,
  );
  return apiOk(saved);
});

export const DELETE = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const id = parseId((await ctx.params).id);
  const name = await softDeletePerfume(id);
  await audit(admin.id, 'sil', 'parfum', id, `Parfüm silindi (geri alınabilir): ${name}`);
  return apiOk({ tamam: true });
});
