import '../../../(vitrin)/vitrin.css';
import { CardGridSkeleton, Skeleton, Spinner, StateMessage } from '@/components/ui/StateMessage';
import { Price } from '@/components/ui/Price';
import { PerfumeCardView } from '@/components/vitrin/PerfumeCardView';
import { requireAdminPage } from '@/lib/server/request';
import { NOTE_TIER_LABELS } from '@/lib/shared/domain';

export const metadata = { title: 'Bileşen vitrini' };

/** Tasarım token'ları ve temel bileşenlerin tek sayfada denendiği iç sayfa. */
export default async function ComponentsPage() {
  await requireAdminPage();
  const sample = {
    id: 0,
    slug: 'ornek',
    name: 'Çok uzun bir parfüm adı: Gece Yarısı Kehribar ve Sandal Ağacı Özel Koleksiyon Edisyonu',
    brandName: 'Örnek Marka',
    brandSlug: 'ornek',
    concentration: 'EDP' as const,
    stockStatus: 'low' as const,
    minPriceKurus: 125000,
    cover: null,
  };
  return (
    <div className="stack">
      <h1>Bileşen vitrini</h1>
      <section className="stack">
        <h2>Tipografi</h2>
        <p style={{ fontSize: 'var(--fs-3xl)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Başlık 49
        </p>
        <p style={{ fontSize: 'var(--fs-2xl)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Başlık 39
        </p>
        <p style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Başlık 31
        </p>
        <p style={{ fontSize: 'var(--fs-md)', margin: 0 }}>
          Gövde 20: Çiçeksi, odunsu ve amber notalar; ığdır, şişe, Ünye.
        </p>
        <p style={{ margin: 0 }}>Gövde 16: Pijamalı hasta yağız şoföre çabucak güvendi.</p>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>
          Yardımcı metin 14
        </p>
      </section>
      <section className="stack">
        <h2>Düğmeler</h2>
        <div className="row">
          <button type="button" className="btn btn-primary">
            Birincil
          </button>
          <button type="button" className="btn btn-secondary">
            İkincil
          </button>
          <button type="button" className="btn btn-ghost">
            Sade
          </button>
          <button type="button" className="btn btn-danger">
            Sil
          </button>
          <button type="button" className="btn btn-primary" disabled>
            Pasif
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            Küçük
          </button>
        </div>
      </section>
      <section className="stack">
        <h2>Form alanı</h2>
        <div className="field">
          <label className="field-label" htmlFor="ornek-1">
            Etiket
          </label>
          <span className="field-hint" id="ornek-1-ipucu">
            İpucu metni
          </span>
          <input id="ornek-1" className="input" aria-describedby="ornek-1-ipucu" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ornek-2">
            Hatalı alan
          </label>
          <input
            id="ornek-2"
            className="input"
            aria-invalid="true"
            aria-describedby="ornek-2-hata"
            defaultValue="yanlış"
          />
          <span className="field-error" id="ornek-2-hata">
            Bu alan geçersiz.
          </span>
        </div>
      </section>
      <section className="stack">
        <h2>Durumlar</h2>
        <StateMessage kind="empty" title="Boş durum">
          Henüz kayıt yok.
        </StateMessage>
        <Spinner label="Yükleniyor durumu" />
        <Skeleton height={20} width="60%" />
        <StateMessage kind="error" title="Hata durumu">
          Sunucuya ulaşılamadı.
        </StateMessage>
        <StateMessage kind="success" title="Başarı durumu">
          Kaydedildi.
        </StateMessage>
        <StateMessage kind="warning" title="Uyarı durumu">
          Alternatif metin eksik.
        </StateMessage>
      </section>
      <section className="stack">
        <h2>Kart ve fiyat</h2>
        <p>
          <Price kurus={125000} /> · <Price kurus={null} />
        </p>
        <div className="grid">
          <div style={{ display: 'flex' }}>
            <PerfumeCardView perfume={sample} />
          </div>
          <div style={{ display: 'flex' }}>
            <PerfumeCardView
              perfume={{
                ...sample,
                id: 1,
                name: 'Kısa ad',
                stockStatus: 'out',
                minPriceKurus: null,
              }}
            />
          </div>
        </div>
        <CardGridSkeleton count={2} />
        <ul className="chips">
          {Object.values(NOTE_TIER_LABELS).map((l) => (
            <li key={l}>
              <a href="#">{l}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
