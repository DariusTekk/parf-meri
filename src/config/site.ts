import type { SiteSettings } from '@/lib/shared/schemas';

/**
 * Varsayılan site ayarları. Panelde "Site ayarları" ekranından kaydedilen değerler
 * bunların üzerine yazılır; kod değiştirmeden yönetilir.
 */
export const siteDefaults: SiteSettings = {
  siteName: 'Nota Esans',
  tagline: 'Seçkin parfümler, notalarına göre keşfedin.',
  heroText:
    'Koku ailesine, notalara ve bütçenize göre süzün; beğendiğiniz parfümü tek mesajla sorun.',
  aboutText:
    'Biz parfüme meraklı küçük bir ekibiz. Koleksiyonumuzdaki her parfümü notaları, kalıcılığı ve kullanım anlarıyla birlikte tanıtmaya çalışıyoruz.\n\nSorularınız için iletişim sayfasındaki kanallardan bize ulaşabilirsiniz.',
  email: '',
  phone: '',
  whatsapp: '',
  address: '',
  workingHours: '',
  instagramUrl: '',
  dataControllerName: '',
};
