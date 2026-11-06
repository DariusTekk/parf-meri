import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { restorePerfume } from '@/lib/server/perfumes';
import { requireAdminApi } from '@/lib/server/request';
import { parseId } from '@/lib/server/route-helpers';

export const POST = handle(
  async (request: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireAdminApi(request);
    const id = parseId((await ctx.params).id);
    const name = await restorePerfume(id);
    await audit(admin.id, 'geri_al', 'parfum', id, `Silinen parfüm geri alındı: ${name}`);
    return apiOk({ tamam: true });
  },
);
