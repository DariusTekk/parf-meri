import { StateMessage } from '@/components/ui/StateMessage';
import { listAudit } from '@/lib/server/audit';
import { requireAdminPage } from '@/lib/server/request';
import { formatDateTime } from '@/lib/shared/format';

export const metadata = { title: 'İşlem geçmişi' };

export default async function AuditPage() {
  await requireAdminPage();
  const rows = await listAudit(200);
  return (
    <>
      <div className="admin-head">
        <h1>İşlem geçmişi</h1>
      </div>
      <p className="muted">Son 200 işlem.</p>
      {rows.length === 0 ? (
        <StateMessage kind="empty" title="Henüz işlem yok" />
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">İşlem geçmişi</caption>
            <thead>
              <tr>
                <th scope="col">Zaman</th>
                <th scope="col">İşlem</th>
                <th scope="col">Yönetici</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</td>
                  <td>{r.summary}</td>
                  <td>{r.email ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
