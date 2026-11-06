import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { requireAdminApi } from '@/lib/server/request';
import { parseJson } from '@/lib/server/route-helpers';
import { createTaxonomy } from '@/lib/server/taxonomy';
import { KIND_LABELS, parseKind } from '@/lib/server/taxonomy-kinds';
import { taxonomySchema } from '@/lib/shared/schemas';

export const POST = handle(
  async (request: NextRequest, ctx: { params: Promise<{ tur: string }> }) => {
    const admin = await requireAdminApi(request);
    const kind = parseKind((await ctx.params).tur);
    const input = await parseJson(request, taxonomySchema);
    const id = await createTaxonomy(kind, input.name, input.description);
    await audit(admin.id, 'olustur', kind, id, `${KIND_LABELS[kind]} eklendi: ${input.name}`);
    return apiOk({ id }, 201);
  },
);
