import { getDb } from './db';
import { nowIso } from '@/lib/shared/format';

export async function audit(
  adminId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  summary: string,
): Promise<void> {
  await getDb()
    .insertInto('audit_log')
    .values({
      admin_id: adminId,
      action,
      entity,
      entity_id: entityId === null ? null : String(entityId),
      summary: summary.slice(0, 300),
      created_at: nowIso(),
    })
    .execute();
}

export async function listAudit(limit = 100) {
  return getDb()
    .selectFrom('audit_log')
    .leftJoin('admins', 'admins.id', 'audit_log.admin_id')
    .select([
      'audit_log.id',
      'audit_log.action',
      'audit_log.entity',
      'audit_log.entity_id',
      'audit_log.summary',
      'audit_log.created_at',
      'admins.email',
    ])
    .orderBy('audit_log.created_at', 'desc')
    .orderBy('audit_log.id', 'desc')
    .limit(limit)
    .execute();
}
