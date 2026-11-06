import { FavoritesList } from '@/components/vitrin/FavoritesList';
import { getSettings } from '@/lib/server/settings';
import { t } from '@/i18n/tr';

export const metadata = {
  title: t.favorites.title,
  robots: { index: false },
  alternates: { canonical: '/favoriler' },
};

export default async function FavoritesPage() {
  const settings = await getSettings();
  return (
    <div className="container section-tight">
      <h1>{t.favorites.title}</h1>
      <p className="muted">{t.favorites.note}</p>
      <FavoritesList whatsapp={settings.whatsapp} />
    </div>
  );
}
