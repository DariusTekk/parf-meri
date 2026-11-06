import Link from 'next/link';
import { Heart } from 'lucide-react';
import { t } from '@/i18n/tr';
import { NavLink } from './NavLink';

export function SiteHeader({ siteName }: { siteName: string }) {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand-mark">
          {siteName}
        </Link>
        <nav className="site-nav" aria-label={t.nav.main}>
          <ul>
            <li>
              <NavLink href="/parfumler">{t.nav.catalog}</NavLink>
            </li>
            <li>
              <NavLink href="/favoriler">
                <Heart size={18} aria-hidden="true" />
                {t.nav.favorites}
              </NavLink>
            </li>
            <li>
              <NavLink href="/hakkimizda">{t.nav.about}</NavLink>
            </li>
            <li>
              <NavLink href="/iletisim">{t.nav.contact}</NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
