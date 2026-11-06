import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { setStatusBulk } from '@/lib/server/perfumes';
import { requireAdminApi } from '@/lib/server/request';
import { parseJson } from '@/lib/server/route-helpers';
import { STATUS_LABELS } from '@/lib/shared/domain';
import { bulkStatusSchema } from '@/lib/shared/schemas';

export const POST = handle(async (request: NextRequest) => {
  const admin = await requireAdminApi(request);
  const { ids, status } = await parseJson(request, bulkStatusSchema);
  const result = await setStatusBulk(ids, status);
  if (result.changed.length > 0) {
    await audit(
      admin.id,
      'toplu_durum',
      'parfum',
      result.changed.join(','),
      `${result.changed.length} parfüm toplu olarak "${STATUS_LABELS[status]}" yapıldı`,
    );
  }
  return apiOk(result);
});
