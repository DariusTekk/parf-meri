import { sql } from 'kysely';
import { getDb } from '@/lib/server/db';
import { apiError, apiOk } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await sql`SELECT 1`.execute(getDb());
    return apiOk({ durum: 'iyi' });
  } catch {
    return apiError('sunucu_hatasi', 'Veritabanına ulaşılamıyor.');
  }
}
