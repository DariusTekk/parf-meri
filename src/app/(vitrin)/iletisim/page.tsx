import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { ContactForm } from '@/components/vitrin/ContactForm';
import { getDb } from '@/lib/server/db';
import { getSettings } from '@/lib/server/settings';
import { whatsappUrl } from '@/lib/shared/whatsapp';
import { SLUG_PATTERN } from '@/lib/shared/text';
import { t } from '@/i18n/tr';

export const metadata = {
  title: t.contact.title,
  description: 'Parfümlerimiz hakkında soru sormak ve sipariş için bize ulaşın.',
  alternates: { canonical: '/iletisim' },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const settings = await getSettings();
  const raw = (await searchParams).parfum;
  const slug = typeof raw === 'string' && SLUG_PATTERN.test(raw) ? raw : undefined;
  const perfume = slug
    ? await getDb()
        .selectFrom('perfumes')
        .innerJoin('brands', 'brands.id', 'perfumes.brand_id')
        .select(['perfumes.slug', 'perfumes.name', 'brands.name as brand'])
        .where('perfumes.slug', '=', slug)
        .where('perfumes.status', '=', 'published')
        .where('perfumes.deleted_at', 'is', null)
        .executeTakeFirst()
    : undefined;
  const wa = whatsappUrl(settings.whatsapp, 'Merhaba, bilgi almak istiyorum.');
  const hasChannels = Boolean(settings.phone || settings.email || wa || settings.address);

  return (
    <div className="container section-tight">
      <h1>{t.contact.title}</h1>
      <div className="contact-layout">
        <section aria-labelledby="kanallar">
          <h2 id="kanallar">{t.contact.channels}</h2>
          {hasChannels ? (
            <ul style={{ listStyle: 'none', padding: 0 }} className="stack">
              {wa ? (
                <li className="row">
                  <MessageCircle aria-hidden="true" />
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    WhatsApp ile yazın
                    <span className="visually-hidden"> (yeni sekmede açılır)</span>
                  </a>
                </li>
              ) : null}
              {settings.phone ? (
                <li className="row">
                  <Phone aria-hidden="true" />
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>{settings.phone}</a>
                </li>
              ) : null}
              {settings.email ? (
                <li className="row">
                  <Mail aria-hidden="true" />
                  <a href={`mailto:${settings.email}`}>{settings.email}</a>
                </li>
              ) : null}
              {settings.address ? (
                <li className="row">
                  <MapPin aria-hidden="true" />
                  <span>{settings.address}</span>
                </li>
              ) : null}
              {settings.workingHours ? (
                <li className="row">
                  <Clock aria-hidden="true" />
                  <span>{settings.workingHours}</span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="muted">{t.contact.noChannels}</p>
          )}
        </section>
        <section aria-labelledby="form-baslik">
          <h2 id="form-baslik">{t.contact.formTitle}</h2>
          <ContactForm
            perfume={
              perfume
                ? { slug: perfume.slug, label: `${perfume.brand} ${perfume.name}` }
                : undefined
            }
          />
        </section>
      </div>
    </div>
  );
}
