import './(vitrin)/vitrin.css';
import Link from 'next/link';
import { SiteFooter } from '@/components/vitrin/SiteFooter';
import { SiteHeader } from '@/components/vitrin/SiteHeader';
import { getSettings } from '@/lib/server/settings';
import { t } from '@/i18n/tr';

export const metadata = { title: t.notFound.title, robots: { index: false } };

export default async function NotFound() {
  const settings = await getSettings();
  return (
    <>
      <a href="#icerik" className="skip-link">
        {t.common.skipToContent}
      </a>
      <SiteHeader siteName={settings.siteName} />
      <main id="icerik" tabIndex={-1} className="container section">
        <h1>{t.notFound.title}</h1>
        <p className="muted">{t.notFound.body}</p>
        <form
          action="/parfumler"
          method="get"
          role="search"
          className="row"
          style={{ maxWidth: 520, margin: '24px 0' }}
        >
          <label htmlFor="nf-q" className="visually-hidden">
            {t.catalog.search}
          </label>
          <input
            id="nf-q"
            name="q"
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder={t.catalog.search}
          />
          <button className="btn btn-secondary" type="submit">
            {t.catalog.searchButton}
          </button>
        </form>
        <div className="row">
          <Link href="/parfumler" className="btn btn-primary">
            {t.notFound.catalog}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t.common.home}
          </Link>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
