'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileClock, Flower2, Gauge, Inbox, Layers, Settings, Sparkles, Tags } from 'lucide-react';
import { confirmLeave } from './dirty';

const ITEMS = [
  { href: '/admin', label: 'Pano', icon: Gauge, exact: true },
  { href: '/admin/parfumler', label: 'Parfümler', icon: Sparkles },
  { href: '/admin/markalar', label: 'Markalar', icon: Tags },
  { href: '/admin/koku-aileleri', label: 'Koku aileleri', icon: Layers },
  { href: '/admin/notalar', label: 'Notalar', icon: Flower2 },
  { href: '/admin/mesajlar', label: 'Mesajlar', icon: Inbox },
  { href: '/admin/ayarlar', label: 'Site ayarları', icon: Settings },
  { href: '/admin/islem-gecmisi', label: 'İşlem geçmişi', icon: FileClock },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="Panel menüsü">
      <ul>
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  if (!confirmLeave()) e.preventDefault();
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
