import { MessageList } from '@/components/admin/MessageList';
import { CONTACT_RETENTION_DAYS, listMessages } from '@/lib/server/contact';
import { requireAdminPage } from '@/lib/server/request';

export const metadata = { title: 'Mesajlar' };

export default async function MessagesPage() {
  await requireAdminPage();
  const items = await listMessages();
  return (
    <>
      <div className="admin-head">
        <h1>İletişim mesajları</h1>
      </div>
      <p className="muted">
        Mesajlar {CONTACT_RETENTION_DAYS} gün sonra otomatik silinir (KVKK saklama süresi).
      </p>
      <MessageList items={items} />
    </>
  );
}
