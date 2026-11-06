# Parfümeri sitesi ve yönetim paneli: Aşama 0 planı

Durum: onaylandı (Anlam 1) ve uygulandı; kilometre taşı durumları Bölüm 17'de. Tarih: 6 Kasım 2026. Bu plandaki her süre, sayı ve eşik tahmini "(varsayım)" etiketlidir; ölçülmüş değerler ayrıca belirtilir.

## 1. Ürünün amacı

Site sahibinin panelden eklediği parfümleri, Türkiye'deki ziyaretçilere hızlı, erişilebilir ve güvenilir bir katalogda sunmak; ziyaretçiyi sipariş ve soru için iletişim kanalına yönlendirmek.

## 2. Hedef kullanıcılar

| Kullanıcı                  | İhtiyaç                                                                                            | Cihaz (varsayım)                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Ziyaretçi (giriş yok)      | Parfümleri koku ailesi, nota ve fiyata göre bulmak; ayrıntıyı okuyup iletişime geçmek              | Ağırlıkla mobil, Instagram ve arama motorundan gelen trafik |
| Site sahibi (tek yönetici) | Parfüm ekleyip düzenlemek, görsel yüklemek, yayınlamak; site ayarlarını kod değiştirmeden yönetmek | Masaüstü ve mobil                                           |

## 3. Anlam 1 ve Anlam 2

|                 | Anlam 1: Vitrin ve katalog (varsayılan, önerilen)                           | Anlam 2: Tam e-ticaret                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ziyaretçi       | Katalog, arama, filtre, ürün detayı, iletişim, WhatsApp ile sor             | Bunlara ek olarak sepet, ödeme, sipariş takibi, üyelik ya da misafir sipariş                                                                                    |
| Panel           | Parfüm, marka, koku ailesi, nota, görsel, site ayarları, iletişim mesajları | Bunlara ek olarak sipariş, stok adedi, kargo, iade, fatura alanları                                                                                             |
| Dış servis      | Yok                                                                         | Ödeme sağlayıcısı (iyzico, PayTR vb.), kargo entegrasyonu, e-fatura/e-arşiv                                                                                     |
| Mevzuat         | KVKK, çerez                                                                 | KVKK, çerez, 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği (ön bilgilendirme, cayma), ETBİS kaydı, e-arşiv; güncel şartlar resmi kaynaktan doğrulanmalı |
| Efor (varsayım) | Büyük: 12-16 iş günü                                                        | Büyük: Anlam 1'in üstüne 15-25 iş günü, ödeme sağlayıcısı sözleşme süresi hariç                                                                                 |
| Risk            | Düşük-Orta                                                                  | Yüksek (ödeme güvenliği, PCI DSS kapsamı, mevzuat)                                                                                                              |

Öneri: Anlam 1 ile başlamak. Veri modeli varyant (hacim/fiyat) ve stok durumunu şimdiden ayrı tuttuğu için Anlam 2'ye geçiş yeniden tasarım gerektirmez. Anlam 2 "sonraya" listesindedir.

## 4. MVP kullanıcı hikâyeleri

| No  | Hikâye                                                                                                                                             | Ölçülebilir kabul kriteri                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | Site sahibi olarak /admin'e e-posta ve parolayla giriş yapmak istiyorum ki paneli yalnızca ben kullanayım.                                         | Doğru bilgiyle panele girilir; yanlış parolada Türkçe genel hata gösterilir (hangi alanın yanlış olduğu söylenmez); 5 hatalı denemeden sonra 15 dk bekleme uygulanır; çıkıştan sonra eski oturum çereziyle yapılan istek 401 alır; tüm /api/admin uç noktaları ve panel sayfaları oturumsuz 401/403 ya da giriş sayfasına yönlendirme döner (otomatik test).       |
| H2  | Site sahibi olarak parfüm ekleyip düzenlemek, taslağa almak, yayınlamak ve silmek istiyorum.                                                       | Zorunlu alanlar eksikse alan başında Türkçe hata ve odak alan hata özeti çıkar, girilen veri kaybolmaz; silinen kayıt "Silinenler" filtresinde görünür ve geri alınabilir; iki sekmede eşzamanlı düzenlemede ikinci kaydeden 409 alır ve "Bu parfüm siz düzenlerken başka bir sekmede güncellendi" mesajını görür; kaydedilmemiş değişiklikle çıkışta uyarı çıkar. |
| H3  | Site sahibi olarak her parfüme 1-8 görsel yükleyip sıralamak, kapak seçmek ve alt metin yazmak istiyorum.                                          | JPEG/PNG/WebP kabul edilir, imza doğrulaması uzantıdan bağımsızdır; 5 MB üstü ve 9. görsel net hatayla reddedilir; sıralama fareyle ve klavyeyle yapılır; alt metni boş görsel olan parfüm yayınlanırken uyarı verilir; yükleme ilerlemesi yüzde olarak gösterilir.                                                                                                |
| H4  | Ziyaretçi olarak giriş ya da çerez onayı olmadan yayındaki parfümleri görmek istiyorum.                                                            | Giriş yapılmamış istekte yalnızca yayındaki parfümler listelenir; taslak ve silinmiş kayıt hiçbir sayfada, API yanıtında, sitemap'te ve görsel adresinde görünmez (otomatik test); yayınlanan parfüm 60 sn içinde vitrinde görünür (ölçülecek).                                                                                                                    |
| H5  | Ziyaretçi olarak parfümleri arayıp marka, koku ailesi, nota, konsantrasyon ve fiyat aralığına göre süzmek istiyorum.                               | Filtreler URL'de tutulur, sayfa yenilenince korunur; "İstanbul" ile "istanbul", "çiçek" ile "cicek" aynı sonucu verir; sonuç yoksa filtreleri temizleme önerisiyle boş durum gösterilir; sayfa başına 24 ürün.                                                                                                                                                     |
| H6  | Ziyaretçi olarak ürün detayında görselleri, altında açıklamayı, nota piramidini, hacim ve fiyatları görmek istiyorum.                              | Açıklama galerinin altındadır; fiyatı olmayan varyantta "Fiyat için iletişime geçin" yazar; fiyatlar "1.250,00 ₺" biçimindedir; galeri klavyeyle gezilebilir; benzer parfümler bölümü en fazla 4 ürün gösterir.                                                                                                                                                    |
| H7  | Ziyaretçi olarak bir parfüm hakkında soru sormak istiyorum.                                                                                        | Ürün sayfasındaki "WhatsApp ile sor" bağlantısı ürün adını içeren hazır mesajla açılır (yapılandırmada numara varsa); iletişim formu ad, iletişim bilgisi ve mesajla gönderilir, KVKK aydınlatma metnine bağlantı içerir; hatalı alanlar Türkçe açıklanır.                                                                                                         |
| H8  | Site sahibi olarak marka adını, iletişim bilgilerini, ana sayfa vitrin parfümlerini ve koku ailesi listesini kod değiştirmeden yönetmek istiyorum. | Panelde "Site ayarları", "Markalar", "Koku aileleri", "Notalar" ekranları vardır; değişiklik kaydedildikten sonra 60 sn içinde vitrine yansır.                                                                                                                                                                                                                     |

## 5. Kapsam

MVP:

- Vitrin: ana sayfa, katalog (arama, filtre, sıralama, sayfalama), ürün detayı, marka sayfası, hakkımızda, iletişim, KVKK aydınlatma metni, gizlilik ve çerez politikası, 404 ve 500 sayfaları.
- Panel: giriş/çıkış, pano, parfüm listesi ve formu, görsel yönetimi, markalar, koku aileleri, notalar, site ayarları, iletişim mesajları, silinenler ve geri alma, önizleme.
- Altyapı: görsel işleme, SEO (sitemap, robots, schema.org, Open Graph), güvenlik başlıkları, yedek ve geri yükleme betiği, demo veri yükleme/silme, testler, CI, README.
- Onaylanan ek özellikler (bkz. Bölüm 6).

Sonraya:

- Anlam 2 (tam e-ticaret).
- Çoklu dil (metinler tek kaynakta tutulduğu için hazırlık yapılır).
- Çoklu yönetici ve rol.
- Kullanıcı hesapları, yorum ve puanlama.
- Bülten ve ticari ileti (İYS kaydı gerekir; eklenirse güncel şart resmi kaynaktan doğrulanır).
- Analitik (eklenirse onay bandı gerekir).

Yapılmayacak:

- Canlıya alma, alan adı ve barındırma satın alma.
- Ödeme sağlayıcısı entegrasyonu (Anlam 2 seçilmedikçe).
- Gerçek ürün fotoğrafı ve ürün metni üretimi.
- Üçüncü taraf izleyici, reklam pikseli, CDN'den font ya da ikon.
- Kanıtsız iddialar ("%100 orijinal", "24 saat kalıcılık" gibi) içeren hazır metinler.

## 6. Ek özellik önerileri

Etki: ziyaretçiye ya da site sahibine sağlanan fayda (Yüksek/Orta/Düşük). Efor: Küçük < 1 gün, Orta 1-3 gün, Büyük > 3 gün. Hepsi (varsayım).

| No  | Özellik                                                                    | Kullanıcıya faydası                                                  | Etki   | Efor  | MVP önerisi                                |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ | ----- | ------------------------------------------ |
| Ö1  | Nota ve koku ailesi filtresi, nota piramidi                                | Parfümü kokusuna göre bulmak; sektörün temel arama biçimi            | Yüksek | Orta  | Evet                                       |
| Ö2  | Benzer parfümler (aynı koku ailesi ve ortak nota sayısına göre)            | Ziyaretçiyi katalogda tutar, alternatif sunar                        | Yüksek | Küçük | Evet                                       |
| Ö3  | WhatsApp ile sor (ürün adı hazır mesajda)                                  | Türkiye'de en yaygın sipariş kanalı; satışa en kısa yol              | Yüksek | Küçük | Evet                                       |
| Ö4  | Yeni gelenler ve öne çıkanlar bölümü                                       | Ana sayfayı canlı tutar, sahibin vitrini yönlendirmesini sağlar      | Yüksek | Küçük | Evet                                       |
| Ö5  | Stok durumu etiketi (stokta, az kaldı, tükendi, ön sipariş)                | Boşuna iletişimi azaltır                                             | Orta   | Küçük | Evet                                       |
| Ö6  | Favoriler (tarayıcıda, hesapsız)                                           | Ziyaretçi beğendiklerini listeler, WhatsApp'ta tek mesajla sorabilir | Orta   | Küçük | Evet                                       |
| Ö7  | Panel işlem geçmişi (kim, ne zaman, ne değiştirdi)                         | Hatalı değişikliği izlemek; güvenlik denetimi                        | Orta   | Küçük | Evet                                       |
| Ö8  | CSV dışa aktarma (parfüm ve varyantlar)                                    | Yedek, fiyat listesi, toplu kontrol                                  | Orta   | Küçük | Evet                                       |
| Ö9  | Yazdırılabilir ürün kartı (yazdırma stili)                                 | Mağazada raf kartı ya da fuar broşürü                                | Düşük  | Küçük | Hayır, sonraya                             |
| Ö10 | Karşılaştırma (en fazla 3 parfüm yan yana)                                 | Karar vermeyi kolaylaştırır                                          | Orta   | Orta  | Hayır, sonraya                             |
| Ö11 | Son görüntülenenler (tarayıcıda)                                           | Geri dönüşü kolaylaştırır                                            | Düşük  | Küçük | Hayır, sonraya                             |
| Ö12 | Koku ailesi rehberi sayfaları (SEO içerik)                                 | Arama motorundan organik trafik                                      | Orta   | Orta  | Hayır, sonraya                             |
| Ö13 | Paylaş düğmesi (tarayıcının yerel paylaşım menüsü, üçüncü taraf betik yok) | Instagram ve WhatsApp'ta yayılım                                     | Orta   | Küçük | Evet                                       |
| Ö14 | CSV içe aktarma                                                            | Çok sayıda ürünü tek seferde eklemek                                 | Orta   | Orta  | Hayır, sonraya                             |
| Ö15 | Karanlık tema (sistem tercihine göre)                                      | Göz konforu                                                          | Düşük  | Küçük | Evet, ancak kısaltma listesinde ilk sırada |

MVP önerisi: Ö1-Ö8, Ö13, Ö15. Onaylamadığınız hiçbir öneri koda girmez.

## 7. Ekran ve akış envanteri

Yetki: Herkes (giriş yok) ya da Yönetici (sunucu tarafında oturum denetimi). Dört durum sütunları her ekranın neyi göstereceğini tanımlar; ekran görüntüsü adları calisma-notlari.md envanterine yazılacak.

| Ekran                            | Yol                                                         | Yetki    | Boş                                                           | Yükleniyor                  | Hata                                             | Başarı                                                           |
| -------------------------------- | ----------------------------------------------------------- | -------- | ------------------------------------------------------------- | --------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Ana sayfa                        | `/`                                                         | Herkes   | Hiç parfüm yoksa "Koleksiyon hazırlanıyor" ve iletişim eylemi | İskelet kartlar (streaming) | Genel hata sayfası, yeniden dene                 | Değer önerisi, "Koleksiyonu keşfet", öne çıkanlar, yeni gelenler |
| Katalog                          | `/parfumler`                                                | Herkes   | Sonuç yok, filtreleri temizle önerisi                         | İskelet ızgara              | Hata kutusu, yeniden dene                        | Izgara, filtreler, sayfalama                                     |
| Ürün detayı                      | `/parfum/[slug]`                                            | Herkes   | uygulanamaz: kayıt yoksa 404                                  | Galeri ve metin iskeleti    | Hata sayfası                                     | Galeri, açıklama, nota piramidi, varyantlar, benzerler           |
| Marka                            | `/marka/[slug]`                                             | Herkes   | Markanın yayında ürünü yok mesajı                             | İskelet ızgara              | Hata sayfası                                     | Marka açıklaması ve ürünleri                                     |
| Favoriler                        | `/favoriler`                                                | Herkes   | "Henüz favori eklemediniz"                                    | İskelet                     | Depolama erişilemezse açıklama                   | Liste, WhatsApp'ta sor                                           |
| Hakkımızda                       | `/hakkimizda`                                               | Herkes   | Metin girilmemişse kısa varsayılan metin                      | uygulanamaz: statik         | Hata sayfası                                     | Metin                                                            |
| İletişim                         | `/iletisim`                                                 | Herkes   | uygulanamaz: form her zaman dolu alanlarla açılır             | Gönderiliyor durumu         | Alan hataları, sunucu hatası                     | Teşekkür mesajı                                                  |
| KVKK aydınlatma                  | `/kvkk-aydinlatma`                                          | Herkes   | uygulanamaz: statik                                           | uygulanamaz: statik         | Hata sayfası                                     | Metin                                                            |
| Gizlilik ve çerez                | `/gizlilik-ve-cerezler`                                     | Herkes   | uygulanamaz: statik                                           | uygulanamaz: statik         | Hata sayfası                                     | Metin                                                            |
| 404                              | her bilinmeyen yol                                          | Herkes   | uygulanamaz                                                   | uygulanamaz                 | Kendisi hata durumudur                           | Aramaya ve kataloğa yönlendirme                                  |
| Giriş                            | `/admin/giris`                                              | Herkes   | uygulanamaz                                                   | Giriş yapılıyor             | Hatalı bilgi, kilitli hesap, oturum süresi doldu | Panoya yönlendirme                                               |
| Pano                             | `/admin`                                                    | Yönetici | İlk kullanım rehberi                                          | İskelet                     | Hata kutusu                                      | Sayılar, son işlemler, eksik alt metin uyarıları                 |
| Parfüm listesi                   | `/admin/parfumler`                                          | Yönetici | "İlk parfümünüzü ekleyin"                                     | İskelet tablo               | Hata kutusu                                      | Tablo, arama, durum filtresi, sayfalama, toplu yayından kaldırma |
| Parfüm formu                     | `/admin/parfumler/yeni`, `/admin/parfumler/[id]`            | Yönetici | Yeni kayıtta boş form                                         | Kaydediliyor                | Alan hataları, 409 çakışma, sunucu hatası        | "Kaydedildi" bildirimi                                           |
| Görsel yönetimi                  | formun içinde                                               | Yönetici | "Görsel ekleyin (en az 1)"                                    | Dosya başına ilerleme       | Tür, boyut, sayı hatası                          | Küçük resimler, kapak işareti                                    |
| Önizleme                         | `/admin/parfumler/[id]/onizleme`                            | Yönetici | uygulanamaz                                                   | İskelet                     | Hata sayfası                                     | Vitrin görünümü ve "Önizleme" şeridi                             |
| Markalar, Koku aileleri, Notalar | `/admin/markalar`, `/admin/koku-aileleri`, `/admin/notalar` | Yönetici | "Henüz kayıt yok"                                             | İskelet                     | Hata kutusu, kullanımda olan kaydı silme hatası  | Liste ve satır içi düzenleme                                     |
| Site ayarları                    | `/admin/ayarlar`                                            | Yönetici | Varsayılan değerlerle form                                    | Kaydediliyor                | Alan hataları                                    | Kaydedildi                                                       |
| İletişim mesajları               | `/admin/mesajlar`                                           | Yönetici | "Mesaj yok"                                                   | İskelet                     | Hata kutusu                                      | Liste, okundu işareti, silme                                     |
| İşlem geçmişi                    | `/admin/islem-gecmisi`                                      | Yönetici | "Kayıt yok"                                                   | İskelet                     | Hata kutusu                                      | Liste                                                            |
| Bileşen vitrini                  | `/admin/bilesenler`                                         | Yönetici | uygulanamaz                                                   | uygulanamaz                 | uygulanamaz                                      | Tüm bileşenler ve durumlar                                       |

Ana akışlar:

1. Yönetici girer, parfüm oluşturur, görsel yükler, açıklama yazar, önizler, yayınlar; ziyaretçi katalogda görür.
2. Ziyaretçi ana sayfadan kataloğa gider, süzer, ürün detayını açar, WhatsApp ile sorar ya da formu doldurur.
3. Yönetici parfümü siler, "Silinenler"den geri alır.

## 8. Veri modeli

Tüm zamanlar UTC (ISO 8601 metin) saklanır, gösterimde Europe/Istanbul kullanılır. Para kuruş cinsinden tamsayıdır. Demo kayıtlar `is_demo = 1` taşır.

| Tablo                | Alanlar                                                                                                                                                                                                                                                                                                                                   | Kısıt ve indeks                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `admins`             | id, email, password_hash (argon2id), created_at, updated_at                                                                                                                                                                                                                                                                               | email benzersiz                                                                  |
| `sessions`           | id, admin_id, token_hash (SHA-256), created_at, last_seen_at, expires_at, user_agent_hash                                                                                                                                                                                                                                                 | token_hash benzersiz, expires_at indeksli                                        |
| `login_attempts`     | id, key (e-posta + IP özeti), attempted_at, success                                                                                                                                                                                                                                                                                       | (key, attempted_at) indeksli                                                     |
| `brands`             | id, name, slug, description, is_demo, created_at, updated_at, deleted_at                                                                                                                                                                                                                                                                  | slug benzersiz                                                                   |
| `fragrance_families` | id, name, slug, sort_order, is_demo                                                                                                                                                                                                                                                                                                       | slug benzersiz                                                                   |
| `notes`              | id, name, slug, is_demo                                                                                                                                                                                                                                                                                                                   | slug benzersiz                                                                   |
| `perfumes`           | id, brand_id, family_id, name, slug, description_md, concentration (EDT/EDP/PARFUM/EDC/EXTRAIT), gender (kadın/erkek/unisex, opsiyonel), status (draft/published), is_featured, allergens_text (opsiyonel), seo_title, seo_description, search_text (Türkçe normalleştirilmiş), published_at, created_at, updated_at, deleted_at, is_demo | slug benzersiz; (status, deleted_at, published_at) ve created_at indeksli        |
| `perfume_notes`      | perfume_id, note_id, tier (top/heart/base)                                                                                                                                                                                                                                                                                                | birincil anahtar (perfume_id, note_id, tier)                                     |
| `perfume_variants`   | id, perfume_id, volume_ml, price_kurus (boş olabilir), stock_status (in_stock/low/out/preorder), sort_order                                                                                                                                                                                                                               | perfume_id indeksli                                                              |
| `perfume_images`     | id (rastgele UUID, dosya adı da budur), perfume_id, sort_order, is_cover, alt_text, width, height, blur_data, created_at                                                                                                                                                                                                                  | perfume_id indeksli; parfüm başına en fazla 8 (uygulama ve tetikleyici)          |
| `site_settings`      | key, value_json, updated_at                                                                                                                                                                                                                                                                                                               | key birincil                                                                     |
| `contact_messages`   | id, name, contact, message, perfume_id (opsiyonel), created_at, read_at                                                                                                                                                                                                                                                                   | created_at indeksli; 6 ay sonra otomatik silinir (varsayım, KVKK saklama süresi) |
| `audit_log`          | id, admin_id, action, entity, entity_id, summary, created_at                                                                                                                                                                                                                                                                              | created_at indeksli; kişisel veri içermez                                        |

Eşzamanlılık: form, açıldığı andaki `updated_at` değerini gizli alanla gönderir; sunucu `UPDATE ... WHERE id = ? AND updated_at = ?` çalıştırır, etkilenen satır 0 ise 409 döner.

Arama: `search_text` alanı ad, marka, notalar ve koku ailesinden üretilir; Türkçe küçük harf (İ→i, I→ı) ve aksan katlama (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u) uygulanır. Sorgu da aynı işlemden geçer. Katalog boyutu birkaç bin kaydın altında kaldıkça (varsayım) indeksli LIKE yeterlidir; aşılırsa SQLite FTS5 eklenir.

## 9. Yığın ve gerekçe

Seçim: tek bir Next.js uygulaması (vitrin + panel + API), SQLite veritabanı, yerel diskte görsel depolama.

| Karar             | Seçim                                                                                                                        | Gerekçe                                                                                                                       | Alternatif                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Çatı              | Next.js 16.4 (App Router), React 19.3                                                                                        | Sunucu bileşenleriyle vitrinde az JS, isteğe bağlı yeniden doğrulama (yayınlanınca anında güncelleme), tek dil ve tek dağıtım | Astro + ayrı API (iki parça, panel için daha fazla iş)                                                 |
| Dil               | TypeScript 5.9.3                                                                                                             | 7.0.2 yeni yayımlandı (5 Kasım 2026); typescript-eslint ve Next tip denetimi uyumu doğrulanmadı (tahmin)                      | TS 7.x, ekosistem olgunlaşınca                                                                         |
| Veritabanı        | SQLite (better-sqlite3, WAL kipi)                                                                                            | Makinede veritabanı sunucusu yok; tek yönetici, düşük yazma yükü; yedeği tek dosya; kurulum sıfır                             | PostgreSQL (barındırma yönetilen DB sunuyorsa geçilir; Kysely sayesinde sorgular büyük ölçüde taşınır) |
| Sorgu katmanı     | Kysely                                                                                                                       | Tip güvenli, parametrik sorgu; yukarı/aşağı migrasyon desteği (görev şartı)                                                   | Drizzle (aşağı migrasyon yok), Prisma (aşağı migrasyon yok, ağır)                                      |
| Görsel işleme     | sharp                                                                                                                        | Hızlı, Windows x64 için hazır ikili; WebP/AVIF, yeniden boyutlandırma, meta veri silme                                        | Derlenemezse: yalnızca imza ve boyut doğrulaması, işleme kapalı (görev tanımındaki geri çekilme dalı)  |
| Görsel depolama   | Yerel disk, `storage/uploads`, web kökü dışında; route handler ile sunulur                                                   | Taslak/silinmiş ürün görselini 404'le korumak için zorunlu; maliyet sıfır                                                     | S3 uyumlu nesne depolama (Cloudflare R2 vb.), soyutlama katmanı hazır tutulur                          |
| Parola            | @node-rs/argon2 (argon2id)                                                                                                   | Hazır ikili, yerel derleme gerekmez                                                                                           | bcryptjs                                                                                               |
| Doğrulama         | zod 4                                                                                                                        | Sunucu ve istemcide aynı şema                                                                                                 | valibot                                                                                                |
| Biçimli açıklama  | markdown-it, `html: false`, bağlantılar yalnızca http/https/mailto/tel                                                       | Ham HTML'i hiç kabul etmediği için XSS yüzeyi küçük; panelde basit araç çubuğu (kalın, italik, liste, başlık)                 | Zengin metin editörü + DOMPurify (daha ağır)                                                           |
| Oturum            | Kendi uygulamamız: veritabanında oturum, rastgele 256 bit belirteç, çerezde ham, DB'de özet                                  | Tek yönetici için yeterli, bağımlılık yok, çıkışta sunucuda sonlanır                                                          | Auth.js (tek yönetici için fazla)                                                                      |
| Font              | @fontsource-variable/fraunces (başlık), @fontsource-variable/inter (metin), latin + latin-ext alt kümesi, font-display: swap | Kendi sunucumuzdan; Türkçe karakter desteği; OFL-1.1                                                                          | Sistem font yığını (en hızlı, daha az karakter)                                                        |
| İkon              | lucide-react                                                                                                                 | Ağaç sallama ile yalnızca kullanılan ikonlar; ISC                                                                             | Elle SVG                                                                                               |
| Test              | Vitest 5, @vitest/coverage-v8, Playwright 1.65, @axe-core/playwright                                                         | Birim/entegrasyon hızlı; uçtan uca ve erişilebilirlik aynı araçta                                                             | Jest                                                                                                   |
| Kod kalitesi      | ESLint 10 + eslint-config-next, Prettier 3                                                                                   | Next ile uyumlu standart                                                                                                      | Biome                                                                                                  |
| Betikler          | tsx                                                                                                                          | TypeScript betiklerini (seed, yedek, yönetici oluşturma) derlemeden çalıştırmak                                               | node --experimental-strip-types                                                                        |
| Performans ölçümü | Lighthouse 13 (`npx lighthouse`, kuruluma eklenmez)                                                                          | Makinede Chrome 157 var                                                                                                       | Chrome DevTools elle                                                                                   |

Node: 24.22.1 (makinedeki sürüm, değiştirilmeyecek). Node 24 Ekim 2026'dan beri Maintenance LTS, EOL Nisan 2028 (ikincil kaynak; Aşama 1'de nodejs/Release takviminden teyit edilecek). `package.json` içinde `engines.node: ">=24"`.

### Bağımlılık listesi

Sürümler 6 Kasım 2026'da `npm view` ile npm kayıt defterinden okundu (çalıştırılarak görüldü). Kilit dosyası `package-lock.json` tutulur, kurulum `npm ci` ile yapılır.

| Paket                                       | Sürüm             | Tür        | Lisans (Aşama 1'de `npm view license` ile teyit) | Neden                              |
| ------------------------------------------- | ----------------- | ---------- | ------------------------------------------------ | ---------------------------------- |
| next                                        | 16.4.5            | çalışma    | MIT                                              | Çatı                               |
| react, react-dom                            | 19.3.1            | çalışma    | MIT                                              | Arayüz                             |
| kysely                                      | 0.29.8            | çalışma    | MIT                                              | Sorgu ve migrasyon                 |
| better-sqlite3                              | 13.0.3            | çalışma    | MIT                                              | SQLite sürücüsü                    |
| sharp                                       | 0.35.5            | çalışma    | Apache-2.0 (libvips LGPL-3.0, dinamik bağlı)     | Görsel işleme                      |
| @node-rs/argon2                             | 2.2.2             | çalışma    | MIT                                              | Parola özeti                       |
| zod                                         | 4.6.7             | çalışma    | MIT                                              | Girdi doğrulama                    |
| markdown-it                                 | 15.0.3            | çalışma    | MIT                                              | Açıklama biçimlendirme             |
| lucide-react                                | 1.70.0            | çalışma    | ISC                                              | İkonlar                            |
| @fontsource-variable/fraunces               | 5.3.0             | çalışma    | OFL-1.1                                          | Başlık fontu                       |
| @fontsource-variable/inter                  | 5.3.0             | çalışma    | OFL-1.1                                          | Metin fontu                        |
| typescript                                  | 5.9.3             | geliştirme | Apache-2.0                                       | Tip denetimi                       |
| @types/better-sqlite3                       | 9.6.0             | geliştirme | MIT                                              | Tipler                             |
| @types/markdown-it                          | 14.2.0            | geliştirme | MIT                                              | Tipler                             |
| @types/node, @types/react, @types/react-dom | Aşama 1'de güncel | geliştirme | MIT                                              | Tipler                             |
| eslint                                      | 10.14.0           | geliştirme | MIT                                              | Lint                               |
| eslint-config-next                          | 16.4.5            | geliştirme | MIT                                              | Next kuralları                     |
| prettier                                    | 3.9.10            | geliştirme | MIT                                              | Biçimlendirme                      |
| vitest, @vitest/coverage-v8                 | 5.1.0             | geliştirme | MIT                                              | Birim ve entegrasyon testi, kapsam |
| @playwright/test                            | 1.65.0            | geliştirme | Apache-2.0                                       | Uçtan uca test                     |
| @axe-core/playwright                        | 4.14.0            | geliştirme | MPL-2.0                                          | Erişilebilirlik denetimi           |
| tsx                                         | 4.23.15           | geliştirme | MIT                                              | Betik çalıştırma                   |

Kullanılmayacaklar: `@dnd-kit/*` (son yayın Aralık 2024, bakım şüpheli); sıralama yerel sürükle-bırak + klavye için "yukarı/aşağı taşı" düğmeleriyle yazılır. `file-type` gerekmez; imza kontrolü 12 baytlık elle doğrulama + sharp'ın içerikten format tespitiyle iki katmanlı yapılır.

## 10. Mimari ve dış servisler

```
Tarayıcı ──► Next.js (Node 24)
              ├─ app/(vitrin)      sunucu bileşenleri, ISR + isteğe bağlı yeniden doğrulama
              ├─ app/admin         panel; her sayfa ve eylemde sunucu tarafı oturum denetimi
              ├─ app/api/admin/*   yükleme, sıralama, CSV; her uç noktada oturum + CSRF denetimi
              ├─ app/gorsel/[id]/[genislik]  görsel sunumu; yayın durumunu denetler
              ├─ lib/server        db (Kysely), auth, images, search, cache
              └─ data/app.sqlite, storage/uploads/  (web kökü dışında)
```

- Önbellek: vitrin sayfaları `revalidate = 300` sn (varsayım) ile statik/ISR; yayınlama, düzenleme, silme ve ayar değişikliği `revalidateTag` ile ilgili etiketleri (parfüm, katalog, marka, ana sayfa, sitemap) anında geçersiz kılar. Hedef: 60 sn içinde görünürlük; beklenen değer 1-3 sn (tahmin), ölçülecek.
- Görsel sunumu: `/gorsel/{uuid}/{400|800|1600}.{webp|avif}`; yayındaki ürün için `Cache-Control: public, max-age=31536000, immutable` (dosya adı içerik değişince değişir); taslak/silinmiş için 404 ve `no-store`. Yönetici oturumu varsa taslak görseller de sunulur (önizleme için).
- Dış servis: yok. WhatsApp yalnızca kullanıcı tıklayınca açılan `wa.me` bağlantısıdır, sayfa yüklenirken üçüncü taraf istek olmaz. Hedef: üçüncü taraf alan adına 0 istek.
- Yapılandırma: `config/site.ts` varsayılanları + `site_settings` tablosu (panelden değişir). Marka adı önerileri (yer tutucu, sizin seçiminiz): "Nota Esans", "Koku Atlası", "Amber & Selvi". Renk önerisi: koyu mürdüm (#3B1F2B) ana renk, kehribar (#B7791F, yalnızca büyük metin ve süs) vurgu, kırık beyaz zemin (#FAF7F2); kontrastlar Aşama 2'de ölçülecek.

## 11. Güvenlik

OWASP Top 10 (2021, 2025 sürümü yayımlandıysa Dilim 6'da güncel sürüme göre) ve ASVS 4.0.3 seviye 1 temel alınır (sürümler Dilim 6'da resmi kaynaktan teyit edilecek).

- Kimlik doğrulama: argon2id (m=19 MiB, t=2, p=1, OWASP Parola Saklama önerisi, Dilim 6'da teyit); ilk yönetici `npm run admin:create` ile etkileşimli ya da `ADMIN_EMAIL`/`ADMIN_PASSWORD` ortam değişkeninden oluşturulur; kodda, seed'de ve commit'te varsayılan parola yok; en az 12 karakter.
- Giriş sınırı: aynı e-posta+IP için 15 dk içinde 5 hatalı denemede 15 dk bekleme; IP başına dakikada 20 deneme üst sınırı (varsayım).
- Oturum: boşta kalma 2 saat, mutlak 12 saat (varsayım); girişte yeni belirteç (oturum sabitleme yok); çıkışta DB'den silinir. Çerez `__Host-` önekli, HttpOnly, Secure (yerel http geliştirmede Secure kapalı, production'da açık), SameSite=Lax, Path=/.
- Yetkilendirme: `requireAdmin()` her sunucu eylemi, route handler ve panel sayfasında çağrılır; middleware yalnızca yönlendirme kolaylığıdır, güvenlik sınırı değildir. Otomatik test tüm admin uç noktalarını listeleyip oturumsuz 401/403 bekler.
- CSRF: sunucu eylemleri için Next'in Origin denetimi + route handler'larda Origin/Host karşılaştırması ve çift gönderimli belirteç.
- Başlıklar: nonce tabanlı CSP (`default-src 'self'`, `img-src 'self' data:`, `frame-ancestors 'none'`, `form-action 'self'`), HSTS (production), X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (kamera, mikrofon, konum kapalı). `productionBrowserSourceMaps: false`.
- Girdi: tüm girdiler zod ile sunucuda doğrulanır; sorgular Kysely ile parametrik; hata gövdesi `{ hata: { kod, mesaj } }` biçiminde, yığın izi yok.
- Görsel: imza (JPEG FF D8 FF, PNG 89 50 4E 47, WebP RIFF....WEBP) + sharp format tespiti; 5 MB sınırı akış sırasında; piksel sınırı 40 MP (varsayım, dekompresyon bombası); dosya adı UUID; yol bileşenleri UUID ve izinli genişlik listesiyle doğrulanır (yol geçişi testi); EXIF/GPS dahil tüm meta veri silinir. Yükleme geçici dizine yazılır, DB kaydı başarılı olunca kalıcı dizine taşınır; başarısızlıkta silinir; ayrıca 24 saatten eski yetim dosyaları silen temizlik görevi (test var).
- Günlük: parola, belirteç, e-posta ve telefon günlüğe yazılmaz.
- Bağımlılık: `npm audit --omit=dev` CI'da raporlanır; yüksek ve kritik bulgu derlemeyi kırar.
- Sırlar: yalnızca ortam değişkenleri; `.env.example` gerçek değer içermez; ilk commit öncesi sır taraması (git kurulursa `git grep` + desen listesi).

## 12. KVKK ve çerezler

- Toplanan kişisel veri: yalnızca iletişim formu (ad, e-posta ya da telefon, mesaj) ve yönetici hesabı. Analitik ve izleyici yok.
- Çerez: yalnızca yönetici oturum çerezi (kesinlikle gerekli). Favoriler tarayıcının yerel deposunda tutulur, sunucuya gönderilmez; ziyaretçinin açık isteğiyle çalışan işlevsel depolamadır. Bu nedenle onay bandı gösterilmez; gizlilik ve çerez politikası bunu açıkça yazar. İleride analitik eklenirse "Reddet"in "Kabul et" kadar kolay olduğu onay bandı zorunlu hale gelir.
- İletişim formu: aydınlatma metnine bağlantı ve "okudum" bilgilendirmesi; talebe yanıt verme sözleşme/meşru menfaat kapsamında değerlendirildiği için açık rıza istenmez (tahmin; hukuki inceleme gerekir). Saklama süresi 6 ay (varsayım), sonra otomatik silinir; panelden elle silinebilir; silme talebi için iletişim adresi politika metninde yazılı.
- Metinler: KVKK aydınlatma metni, gizlilik ve çerez politikası ayrı sayfalardır. Hepsi taslaktır, "Hukuki inceleme gerektirir" notu README ve panelde yer alır. Aydınlatma Yükümlülüğü Tebliği, VERBİS yükümlülüğü eşikleri ve yurt dışına aktarım hükümleri Dilim 5'te kvkk.gov.tr'den doğrulanacak.
- Ürün içerik bilgisi: opsiyonel "Alerjen ve içerik bilgisi" alanı. Kozmetik Ürünler Yönetmeliği ve "Kozmetik Ürünlerde Kullanılan Parfüm Alerjenlerinin Etiketlenmesine İlişkin Kılavuz" (5 Mart 2024 tarihli, 32480 sayılı Resmi Gazete değişikliğine dayanır) etiket yükümlülüğü tanımlar; internet satış sayfasındaki gösterim şartı Dilim 3'te TİTCK resmi sitesinden doğrulanacak.

## 13. Erişilebilirlik (WCAG 2.2 AA)

- Kontrast: metin en az 4,5:1, büyük metin ve arayüz bileşenleri 3:1; token'lar Aşama 2'de hesaplanıp tabloya yazılır. Stok durumu ve form hataları renk + metin + ikonla verilir.
- Klavye: tüm işlevler (galeri, filtre paneli, görsel sıralama, modal) klavyeyle; görünür odak halkası (2px, 3:1 kontrast); "İçeriğe atla" bağlantısı; modal'da odak tuzağı yalnızca açıkken ve Esc ile çıkış.
- Hedef boyutu: en az 24×24 px (2.5.8), mobil birincil eylemler 44×44 px.
- Formlar: `<label for>`, hata `aria-describedby` ile bağlı, `aria-invalid`; gönderimde hata özeti başlığa odak alır; zorunlu alanlar metinle belirtilir.
- Yapı: tek `h1`, sıralı başlıklar, `header/nav/main/footer` landmark'ları, `html lang="tr"`.
- Taşma: 320 px genişlikte ve %200 yakınlaştırmada yatay kaydırma yok; uzun adlar `overflow-wrap: anywhere`.
- Hareket: `prefers-reduced-motion` ile geçişler kapanır.
- Ölçüm: axe-core (Playwright) ana sayfa, katalog, ürün detayı, giriş ve parfüm formunda; hedef kritik ve ciddi ihlal 0. Ekran okuyucu ile test yapılamayacak; "test edilmedi" yazılacak.

## 14. Performans hedefleri

Ölçüm: production build (`npm run build && npm start`), yerel, Lighthouse mobil emülasyonu, Chrome 157.

| Metrik                 | Hedef                                                                                       | Not                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP                    | < 2,5 sn                                                                                    | Ana sayfa, katalog, ürün detayı                                                                                                                                            |
| CLS                    | < 0,1                                                                                       | Görsellerde width/height, font metrik eşleme                                                                                                                               |
| INP                    | < 200 ms                                                                                    | Lighthouse laboratuvar ortamında INP ölçmez; TBT ile yaklaşık değer ve Playwright'ta etkileşim süresi ölçümü raporlanır, INP "ölçülemedi (laboratuvar)" olarak işaretlenir |
| İlk yükte JS (vitrin)  | ≤ 130 KB gzip (varsayım)                                                                    | Next çalışma zamanı dahil                                                                                                                                                  |
| Font                   | 2 değişken font, latin-ext alt kümesi, toplam ≤ 120 KB (varsayım), başlık fontu preload     |                                                                                                                                                                            |
| Görsel                 | 400/800/1600 px WebP + AVIF, `srcset`/`sizes`; kapak `fetchpriority="high"`, diğerleri lazy |                                                                                                                                                                            |
| İlk ekran sorgu sayısı | Katalog için ≤ 4 sorgu (varsayım), N+1 yok; sorgu sayacı testte ölçülür                     |                                                                                                                                                                            |

## 15. Test stratejisi

| Katman          | Araç                   | Kapsam                                                                                                                                                                                                                                                                                                      |
| --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Birim           | Vitest                 | Türkçe normalleştirme ve slug, para ve tarih biçimi, markdown temizleme, imza doğrulama, zod şemaları, oturum süresi hesapları                                                                                                                                                                              |
| Entegrasyon     | Vitest + geçici SQLite | Yayın görünürlüğü (taslak/silinmiş hiçbir sorguda yok), 409 çakışma, giriş sınırı, yetim dosya temizliği, görsel sayısı sınırı, demo yükle/sil, migrasyon yukarı-aşağı-yukarı, sorgu sayısı                                                                                                                 |
| Uçtan uca       | Playwright (Chromium)  | Ana yolculuk: giriş → parfüm ekle → görsel yükle → açıklama → yayınla → ziyaretçi olarak gör (süre ölçümü); yetkisiz admin erişimi (tüm uç noktalar 401/403); taslak görsel adresi 404; 9. görsel, 5 MB üstü, sahte uzantı; Türkçe arama; boş katalog; eşzamanlı düzenleme; oturum süresi dolması; yavaş ağ |
| Erişilebilirlik | @axe-core/playwright   | 5 sayfa, kritik ve ciddi 0                                                                                                                                                                                                                                                                                  |
| Performans      | Lighthouse (npx)       | 3 sayfa, mobil                                                                                                                                                                                                                                                                                              |

Kapsam hedefi: `lib/` altındaki sunucu ve yardımcı kodda satır kapsamı %80, dal kapsamı %70 (varsayım); CI'da eşik altında başarısız olur. Flaky test kabul edilmez; Playwright'ta `retries: 0`, sabit bekleme yok.

CI (GitHub Actions, depo kurulunca çalışır): `npm ci` → `lint` → `typecheck` → `test` (birim + entegrasyon + kapsam) → migrasyon yukarı/aşağı/yukarı → `build` → Playwright uçtan uca → `npm audit`.

## 16. Yayın planı (canlıya alma yapılmaz)

- Barındırma seçenekleri: (a) Türkiye'de ya da AB'de VPS (Node 24, kalıcı disk, Caddy ya da Nginx ile TLS) — SQLite ve yerel görsel için en uygun, aylık maliyet düşük (tahmin); (b) kalıcı diskli PaaS (Fly.io, Railway, Render diskli plan); (c) Vercel gibi sunucusuz ortamlar ancak PostgreSQL + nesne depolamaya geçilirse. KVKK açısından sunucu konumu ve yurt dışına aktarım hükmü dikkate alınmalı.
- Süreç: sürüm etiketi `vX.Y.Z`; yayından önce `npm run backup`; `npm run migrate:latest`; uygulama yeniden başlatma.
- Geri alma: önceki sürüm etiketine dönülür, `npm run migrate:down` ile son migrasyon geri alınır; veri bozulmuşsa `npm run restore -- <yedek>` ile veritabanı ve görseller geri yüklenir.
- Hata raporlama: yapılandırılmış JSON günlük (kişisel veri yok) ve `/api/saglik` sağlık uç noktası; harici hata servisi (Sentry vb.) KVKK değerlendirmesi sonrası eklenebilir.

## 17. Kilometre taşları

| Taş | İçerik                                                                | Efor (varsayım) | Durum (6 Kasım 2026)                                       |
| --- | --------------------------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| A0  | Plan                                                                  | Küçük           | Onaylandı: Anlam 1, Ö1-Ö8, Ö13, Ö15                        |
| A1  | İskelet, araçlar, CI, .env.example, lisans                            | Küçük           | Bitti; CI yazıldı, çalıştırılamadı (git ve uzak depo yok)  |
| A2  | Tasarım token'ları, temel bileşenler, bileşen vitrini                 | Orta            | Bitti (`/admin/bilesenler`)                                |
| D1  | Giriş, parfüm oluştur, vitrinde liste ve detay                        | Orta            | Bitti                                                      |
| D2  | Görsel yükleme, işleme, sıralama, kapak, yetim temizliği              | Orta            | Bitti                                                      |
| D3  | Tüm alanlar, arama, filtre, sıralama, sayfalama, 409, migrasyon testi | Orta            | Bitti                                                      |
| D4  | Onaylanan ek özellikler                                               | Orta            | Bitti                                                      |
| D5  | Statik sayfalar, SEO, KVKK ve çerez, 404                              | Küçük           | Bitti; metinler hukuki inceleme bekliyor                   |
| D6  | Güvenlik, erişilebilirlik, performans sertleştirmesi, yedek betiği    | Orta            | Bitti; açık kalan düşük önemli bulgular çalışma notlarında |
| A7  | Doğrulama, ölçüm, README temiz kurulum, teslim                        | Orta            | Bitti                                                      |

### Uygulamada plandan sapmalar

- Vitrin ISR yerine her istekte üretiliyor (`force-dynamic`): CSP nonce'u her yanıtta yenileniyor ve yayınlanan parfüm bir sonraki istekte görünüyor (ölçülen süre 1 sn'nin altında). Önbellek, trafik arttığında ele alınacak iş olarak açık.
- Fontlar: Inter kaldırıldı, gövde metni sistem yazı tipinde; Fraunces `public/fonts` altından `font-display: optional` ile sunuluyor (ilk ölçümde CLS 0,34 idi, şimdi 0).
- ESLint 10 yerine 9.39.5 (eslint-config-next eklentilerinin eş bağımlılığı); "Onay bekleyenler"de.
- CSRF: çift gönderimli belirteç yerine Origin denetimi, özel istek başlığı (`x-istek`) ve SameSite=Lax çerez.
- Giriş kilidi e-posta yerine e-posta+IP'ye bağlı, e-posta başına 30 denemelik ek üst sınırla (güvenlik incelemesi B3).
- İlk yük JS hedefi (130 KB gzip) tutmadı: 146-148 KB; çatının kendisi 131,7 KB.

Toplam: 12-16 iş günü (varsayım).

## 18. Riskler

| No  | Risk                                                                                                      | Önem   | Önlem                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Makinede Git kurulu değil; dal, commit, etiketle geri alma ve CI yapılandırmasının denenmesi mümkün değil | Kritik | Git for Windows'u sizin kurmanız (ör. `winget install --id Git.Git -e`). Kurulmazsa iş commit'siz ilerler, her dilim sonunda `backups/` altına zaman damgalı zip anlık görüntüsü alınır (zayıf yöntem) ve durum notlanır                                                   |
| R2  | better-sqlite3 ya da sharp yerel ikilisinin bu makinede yüklenememesi                                     | Yüksek | Her ikisi win32-x64 için hazır ikili sunar (tahmin); sharp başarısızsa görsel işleme yalnızca doğrulama ve boyut sınırıyla çalışır, alternatif "Onay bekleyenler"e yazılır; better-sqlite3 başarısızsa Node 24'ün yerleşik `node:sqlite` modülü ve Kysely sürücüsü denenir |
| R3  | Next.js 16.4.5 bir günlük yama sürümü; olası gerileme                                                     | Orta   | Sorun çıkarsa aynı hattın önceki yamasına (16.4.4) sabitlenir                                                                                                                                                                                                              |
| R4  | SQLite tek yazıcı; yüksek trafik ya da yatay ölçeklemede darboğaz                                         | Orta   | Okuma ağırlıklı yük ve tek yönetici için yeterli (tahmin); Kysely ile PostgreSQL'e geçiş yolu açık                                                                                                                                                                         |
| R5  | KVKK ve çerez metinlerinin hukuki geçerliliği                                                             | Yüksek | Taslak olarak işaretlenir, hukuki inceleme önerilir                                                                                                                                                                                                                        |
| R6  | Lighthouse'un INP ölçmemesi                                                                               | Düşük  | TBT ve Playwright etkileşim süresi raporlanır, INP "ölçülemedi"                                                                                                                                                                                                            |
| R7  | Ekran okuyucu ve Safari/gerçek cihaz testi yapılamaması                                                   | Orta   | Koddan görülen işaretler raporlanır, "test edilmedi" listesi                                                                                                                                                                                                               |
| R8  | Kontrast hedefinin marka renkleriyle çakışması                                                            | Düşük  | Vurgu rengi yalnızca büyük metin ve süste kullanılır                                                                                                                                                                                                                       |
| R9  | Panel hesabının ele geçirilmesi                                                                           | Kritik | argon2id, giriş sınırı, kısa oturum, işlem geçmişi; iki aşamalı doğrulama "sonraya" adayı                                                                                                                                                                                  |

## 19. Tasarım kararları

- Tipografi ölçeği (1,25 oranı, varsayım): 14 / 16 / 20 / 25 / 31 / 39 / 49 px; gövde 16 px, satır yüksekliği 1,6.
- Boşluk: 4/8 sistemi (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Karanlık tema: token'lar baştan iki tema için tanımlanır; `prefers-color-scheme` ile otomatik, elle değiştirme düğmesi yok (Ö15 onaylanırsa). Süre daralırsa ilk kısaltılacak iş budur.
- Görsel oranı: ürün görselleri 4:5 dikey kırpılmadan `object-fit: contain` ile; kart ızgarası mobilde 2, tablette 3, masaüstünde 4 sütun.

## 20. Verilen kararlar

1. Anlam 1 seçildi; Anlam 2 "sonraya" listesinde.
2. Ek özelliklerden MVP önerisi (Ö1-Ö8, Ö13, Ö15) uygulandı; Ö9-Ö12 ve Ö14 koda girmedi.
3. Git kurulmadı; commit'siz ilerlendi, dilim sonlarında zip anlık görüntüsü alındı.
4. Yığın onaylandı; sapmalar Bölüm 17'de.
5. Marka adı ve renk için tercih belirtilmedi; "Nota Esans" ve önerilen renkler yer tutucu olarak kullanıldı. Site adı panelin site ayarlarından, renkler `src/app/globals.css` dosyasındaki token'lardan değiştirilir.
