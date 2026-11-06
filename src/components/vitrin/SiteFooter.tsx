import Link from 'next/link';
import type { SiteSettings } from '@/lib/shared/schemas';
import { t } from '@/i18n/tr';

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h2>{settings.siteName}</h2>
          <p className="muted">{settings.tagline}</p>
          {settings.address ? <p>{settings.address}</p> : null}
          {settings.phone ? (
            <p>
              <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>{settings.phone}</a>
            </p>
          ) : null}
          {settings.email ? (
            <p>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </p>
          ) : null}
        </div>
        <div>
          <h2>{t.footer.corporate}</h2>
          <ul>
            <li>
              <Link href="/hakkimizda">{t.nav.about}</Link>
            </li>
            <li>
              <Link href="/iletisim">{t.nav.contact}</Link>
            </li>
            <li>
              <Link href="/parfumler">{t.nav.catalog}</Link>
            </li>
            {settings.instagramUrl ? (
              <li>
                <a href={settings.instagramUrl} rel="noopener noreferrer">
                  Instagram
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <h2>{t.footer.legal}</h2>
          <ul>
            <li>
              <Link href="/kvkk-aydinlatma">{t.footer.kvkk}</Link>
            </li>
            <li>
              <Link href="/gizlilik-ve-cerezler">{t.footer.privacy}</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container">
        <p className="muted" style={{ marginTop: 24, marginBottom: 0 }}>
          © {year} {settings.siteName}. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
