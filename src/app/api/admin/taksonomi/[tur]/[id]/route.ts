import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { requireAdminApi } from '@/lib/server/request';
import { parseId, parseJson } from '@/lib/server/route-helpers';
import { deleteTaxonomy, renameTaxonomy } from '@/lib/server/taxonomy';
import { taxonomySchema } from '@/lib/shared/schemas';
import { KIND_LABELS, parseKind } from '@/lib/server/taxonomy-kinds';

type Ctx = { params: Promise<{ tur: string; id: string }> };

export const PATCH = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const p = await ctx.params;
  const kind = parseKind(p.tur);
  const id = parseId(p.id);
  const input = await parseJson(request, taxonomySchema);
  await renameTaxonomy(kind, id, input.name, input.description);
  await audit(admin.id, 'guncelle', kind, id, `${KIND_LABELS[kind]} güncellendi: ${input.name}`);
  return apiOk({ tamam: true });
});

export const DELETE = handle(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireAdminApi(request);
  const p = await ctx.params;
  const kind = parseKind(p.tur);
  const id = parseId(p.id);
  await deleteTaxonomy(kind, id);
  await audit(admin.id, 'sil', kind, id, `${KIND_LABELS[kind]} silindi`);
  return apiOk({ tamam: true });
});
