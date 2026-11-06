import { getSettings } from '@/lib/server/settings';
import { markdownToPlain, renderMarkdown } from '@/lib/shared/markdown';
import { t } from '@/i18n/tr';

export async function generateMetadata() {
  const s = await getSettings();
  return {
    title: t.nav.about,
    description: markdownToPlain(s.aboutText) || s.tagline,
    alternates: { canonical: '/hakkimizda' },
  };
}

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <div className="container section-tight">
      <h1>{t.nav.about}</h1>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(settings.aboutText, 2) }}
      />
    </div>
  );
}
