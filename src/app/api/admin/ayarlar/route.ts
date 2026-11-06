import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { apiOk, handle } from '@/lib/server/http';
import { requireAdminApi } from '@/lib/server/request';
import { parseJson } from '@/lib/server/route-helpers';
import { saveSettings } from '@/lib/server/settings';
import { settingsSchema } from '@/lib/shared/schemas';

export const PUT = handle(async (request: NextRequest) => {
  const admin = await requireAdminApi(request);
  const settings = await parseJson(request, settingsSchema);
  await saveSettings(settings);
  await audit(admin.id, 'guncelle', 'ayarlar', null, 'Site ayarları güncellendi');
  return apiOk({ tamam: true });
});
