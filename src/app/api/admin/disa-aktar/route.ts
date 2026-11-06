import type { NextRequest } from 'next/server';
import { audit } from '@/lib/server/audit';
import { handle } from '@/lib/server/http';
import { exportRows } from '@/lib/server/perfumes';
import { requireAdminApi } from '@/lib/server/request';
import { toCsv } from '@/lib/shared/csv';
import { CONCENTRATION_LABELS, STATUS_LABELS, STOCK_LABELS } from '@/lib/shared/domain';
import { formatDateTime } from '@/lib/shared/format';

export const GET = handle(async (request: NextRequest) => {
  const admin = await requireAdminApi(request);
  const rows = await exportRows();
  const header = [
    'Kimlik',
    'Ad',
    'Kısa ad',
    'Marka',
    'Koku ailesi',
    'Konsantrasyon',
    'Durum',
    'Stok',
    'Hacim (ml)',
    'Fiyat (TL)',
    'Güncelleme',
  ];
  const body = rows.map((r) => [
    r.id,
    r.name,
    r.slug,
    r.brand,
    r.family ?? '',
    CONCENTRATION_LABELS[r.concentration],
    r.deleted_at ? 'Silinmiş' : STATUS_LABELS[r.status],
    STOCK_LABELS[r.stock_status],
    r.volume_ml ?? '',
    r.price_kurus === null || r.price_kurus === undefined
      ? ''
      : (r.price_kurus / 100).toFixed(2).replace('.', ','),
    formatDateTime(r.updated_at),
  ]);
  await audit(admin.id, 'disa_aktar', 'parfum', null, 'Parfüm listesi CSV olarak indirildi');
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv([header, ...body]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="parfumler-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
