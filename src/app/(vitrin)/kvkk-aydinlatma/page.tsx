import { CONTACT_RETENTION_DAYS } from '@/lib/server/contact';
import { getSettings } from '@/lib/server/settings';
import { formatDate } from '@/lib/shared/format';

export const metadata = {
  title: 'KVKK aydınlatma metni',
  description:
    'İletişim formu aracılığıyla toplanan kişisel verilerin işlenmesine ilişkin aydınlatma metni.',
  alternates: { canonical: '/kvkk-aydinlatma' },
};

const UPDATED_AT = '2026-11-06T09:00:00.000Z';

export default async function KvkkPage() {
  const s = await getSettings();
  const controller = s.dataControllerName || s.siteName;
  const contact = [s.address, s.email].filter(Boolean).join(', ');
  return (
    <div className="container section-tight prose">
      <h1>Kişisel verilerin işlenmesine ilişkin aydınlatma metni</h1>
      <p className="muted">Son güncelleme: {formatDate(UPDATED_AT)}</p>

      <h2>Veri sorumlusu</h2>
      <p>
        6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu {controller}
        {contact ? ` (${contact})` : ''}&apos;dir.
      </p>

      <h2>İşlenen kişisel veriler</h2>
      <p>Yalnızca iletişim formunu doldurduğunuzda şu veriler işlenir:</p>
      <ul>
        <li>Kimlik: adınız</li>
        <li>İletişim: e-posta adresiniz ya da telefon numaranız</li>
        <li>Talep: mesajınızın içeriği ve varsa sorduğunuz parfüm</li>
      </ul>
      <p>
        Sitede gezinmek için hiçbir kişisel veri istenmez. Ziyaretçi analitiği, reklam ya da izleme
        aracı kullanılmaz.
      </p>

      <h2>İşleme amacı ve hukuki sebep</h2>
      <p>
        Verileriniz, soru ve sipariş talebinize yanıt vermek amacıyla işlenir. Hukuki sebep, KVKK
        madde 5/2-c (bir sözleşmenin kurulmasıyla doğrudan ilgili olması) ve madde 5/2-f (talebinize
        yanıt verilmesindeki meşru menfaat) hükümleridir. Bu nedenle ayrıca açık rıza istenmez.
      </p>

      <h2>Toplama yöntemi</h2>
      <p>
        Veriler, sitedeki iletişim formu aracılığıyla elektronik ortamda, sizin tarafınızdan
        girilerek toplanır.
      </p>

      <h2>Aktarım</h2>
      <p>
        Verileriniz üçüncü kişilere aktarılmaz ve yurt dışına gönderilmez. Sitenin barındırıldığı
        sunucu sağlayıcısı yalnızca teknik altyapı hizmeti sunar.
      </p>

      <h2>Saklama süresi</h2>
      <p>
        İletişim mesajları {CONTACT_RETENTION_DAYS} gün sonra otomatik olarak silinir. Talebiniz bir
        siparişe dönüşürse, ilgili mevzuatın öngördüğü süreler uygulanır.
      </p>

      <h2>Haklarınız</h2>
      <p>KVKK madde 11 uyarınca veri sorumlusuna başvurarak:</p>
      <ul>
        <li>kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme,</li>
        <li>işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>verilerin aktarıldığı üçüncü kişileri bilme,</li>
        <li>eksik ya da yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>KVKK madde 7 çerçevesinde silinmesini ya da yok edilmesini isteme,</li>
        <li>düzeltme ve silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme,</li>
        <li>
          münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme,
        </li>
        <li>
          kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme
        </li>
      </ul>
      <p>haklarına sahipsiniz.</p>
      <p>
        Başvurularınızı{' '}
        {s.email ? (
          <a href={`mailto:${s.email}`}>{s.email}</a>
        ) : (
          'iletişim sayfasında belirtilen kanallardan'
        )}{' '}
        yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak yanıtlanır.
      </p>
    </div>
  );
}
