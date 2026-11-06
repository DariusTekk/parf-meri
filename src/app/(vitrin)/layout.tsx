import './vitrin.css';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/vitrin/SiteFooter';
import { SiteHeader } from '@/components/vitrin/SiteHeader';
import { getSettings } from '@/lib/server/settings';
import { t } from '@/i18n/tr';

export default async function VitrinLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#icerik" className="skip-link">
        {t.common.skipToContent}
      </a>
      <SiteHeader siteName={settings.siteName} />
      <main id="icerik" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
