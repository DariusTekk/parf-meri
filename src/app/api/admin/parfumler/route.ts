import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { savePerfume } from '@/lib/server/perfumes';
import { requireAdminApi } from '@/lib/server/request';
import { parseJson } from '@/lib/server/route-helpers';
import { perfumeInputSchema } from '@/lib/shared/schemas';

export const POST = handle(async (request: NextRequest) => {
  const admin = await requireAdminApi(request);
  const input = await parseJson(request, perfumeInputSchema);
  const saved = await savePerfume(input);
  await audit(admin.id, 'olustur', 'parfum', saved.id, `Parfüm oluşturuldu: ${input.name}`);
  return apiOk(saved, 201);
});
