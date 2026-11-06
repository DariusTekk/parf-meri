import Link from 'next/link';
import { getSettings } from '@/lib/server/settings';
import { formatDate } from '@/lib/shared/format';

export const metadata = {
  title: 'Gizlilik ve çerez politikası',
  description: 'Sitede hangi çerezlerin ve tarayıcı depolamasının kullanıldığı.',
  alternates: { canonical: '/gizlilik-ve-cerezler' },
};

const UPDATED_AT = '2026-11-06T09:00:00.000Z';

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <div className="container section-tight prose">
      <h1>Gizlilik ve çerez politikası</h1>
      <p className="muted">Son güncelleme: {formatDate(UPDATED_AT)}</p>

      <h2>Kısaca</h2>
      <p>
        {s.siteName} sitesinde ziyaretçiler için çerez kullanılmaz; analitik, reklam ya da sosyal
        medya izleme aracı yoktur. Bu nedenle çerez onay bandı gösterilmez. Sayfalar, yazı tipleri
        ve görseller yalnızca bu sitenin kendi sunucusundan yüklenir.
      </p>

      <h2>Kullanılan çerezler</h2>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Çerezler</caption>
          <thead>
            <tr>
              <th scope="col">Ad</th>
              <th scope="col">Kimde</th>
              <th scope="col">Amaç</th>
              <th scope="col">Süre</th>
              <th scope="col">Tür</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>__Host-oturum</td>
              <td>Yalnızca site yöneticisi</td>
              <td>Yönetim paneline giriş yapmış yöneticinin oturumunu tanır.</td>
              <td>En fazla 12 saat; 2 saat işlem yapılmazsa sona erer</td>
              <td>Kesinlikle gerekli</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Tarayıcı depolaması (favoriler)</h2>
      <p>
        Bir parfümü favorilere eklediğinizde, parfümün kısa adı tarayıcınızın yerel deposunda
        (&quot;favoriler&quot; anahtarı) saklanır. Bu bilgi sunucumuza gönderilmez; yalnızca{' '}
        <Link href="/favoriler">Favoriler</Link> sayfasında listeyi göstermek için kullanılır.
        Listeyi Favoriler sayfasından ya da tarayıcınızın site verilerini silerek
        temizleyebilirsiniz.
      </p>

      <h2>İletişim formu</h2>
      <p>
        Formda paylaştığınız bilgilerin nasıl işlendiği{' '}
        <Link href="/kvkk-aydinlatma">aydınlatma metninde</Link> açıklanmıştır.
      </p>

      <h2>Sunucu kayıtları</h2>
      <p>
        Sunucu, güvenlik ve hata ayıklama için istek zamanını ve istenen adresi kısa süreli olarak
        kaydedebilir. Bu kayıtlar parola, oturum anahtarı ya da form içeriği barındırmaz.
      </p>

      <h2>WhatsApp bağlantıları</h2>
      <p>
        &quot;WhatsApp ile sor&quot; bağlantısına dokunduğunuzda WhatsApp uygulaması ya da sitesi
        açılır. Bu noktadan sonra WhatsApp&apos;ın kendi gizlilik koşulları geçerlidir. Bağlantıya
        dokunmadığınız sürece WhatsApp&apos;a hiçbir bilgi gönderilmez.
      </p>

      <h2>Değişiklikler</h2>
      <p>
        Siteye analitik ya da başka bir zorunlu olmayan araç eklenirse bu sayfa güncellenir ve araç,
        yalnızca onayınızdan sonra çalışacak şekilde bir onay bandıyla sunulur.
      </p>
    </div>
  );
}
