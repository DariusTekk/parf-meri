import { SettingsForm } from '@/components/admin/SettingsForm';
import { requireAdminPage } from '@/lib/server/request';
import { getSettings } from '@/lib/server/settings';

export const metadata = { title: 'Site ayarları' };

export default async function SettingsPage() {
  await requireAdminPage();
  const settings = await getSettings();
  return (
    <>
      <div className="admin-head">
        <h1>Site ayarları</h1>
      </div>
      <p className="muted">
        KVKK aydınlatma metni ve gizlilik politikası bu bilgilerle otomatik doldurulur. Metinler
        taslaktır; yayına almadan önce hukuki inceleme önerilir.
      </p>
      <SettingsForm initial={settings} />
    </>
  );
}
