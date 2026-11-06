import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getEnv } from '@/lib/server/env';
import { getSettings } from '@/lib/server/settings';

// Vitrin her istekte veritabanından okunur: yayınlanan parfüm bir sonraki istekte görünür,
// CSP nonce'u da her yanıtta yenilenir.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(getEnv().siteUrl),
    title: {
      default: `${settings.siteName} | ${settings.tagline}`,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.heroText || settings.tagline,
    applicationName: settings.siteName,
    openGraph: { siteName: settings.siteName, locale: 'tr_TR', type: 'website' },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#171214' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
