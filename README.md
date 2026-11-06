# Parfümeri sitesi

Parfüm kataloğu ve yönetim paneli. Ziyaretçiler giriş yapmadan yayındaki parfümleri görür, arar, süzer, favorilere ekler ve WhatsApp ya da iletişim formuyla soru sorar. Site sahibi `/admin` altındaki panelden parfüm, görsel, marka, koku ailesi, nota ve site ayarlarını yönetir.

Teknoloji: Next.js 16 (App Router), React 19, TypeScript, SQLite (better-sqlite3 + Kysely), sharp. Ayrıntılı gerekçe: [docs/plan.md](docs/plan.md). Bağımlılıklar ve lisanslar: [docs/bagimliliklar.md](docs/bagimliliklar.md).

## Gereksinimler

- Node.js 24 veya üstü (npm 11 ile denendi)
- Windows, macOS ya da Linux (x64 veya arm64). Yerel derleme gerekmez; better-sqlite3, sharp ve argon2 hazır ikili dosyalarla gelir.

## Kurulum

```bash
npm ci
cp .env.example .env
npm run migrate:latest
npm run admin:create
```

Windows PowerShell'de `cp` yerine `Copy-Item .env.example .env` kullanın.

`npm run admin:create` e-posta ve parolayı (en az 12 karakter) terminalde sorar. Etkileşimsiz kurulumda `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ortam değişkenleriyle çalıştırıp ardından bu değişkenleri silin. Aynı e-postayla tekrar çalıştırmak parolayı değiştirir ve açık oturumları kapatır. Kodda ya da veride varsayılan parola yoktur.

## Çalıştırma

| Komut                                                       | Açıklama                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                               | Geliştirme sunucusu, http://localhost:3000                                                                                                 |
| `npm run build`                                             | Production derlemesi                                                                                                                       |
| `npm start`                                                 | Production sunucusu (önce `build`)                                                                                                         |
| `npm run lint`                                              | ESLint                                                                                                                                     |
| `npm run format` / `npm run format:check`                   | Prettier                                                                                                                                   |
| `npm run typecheck`                                         | TypeScript tip denetimi                                                                                                                    |
| `npm test`                                                  | Birim ve entegrasyon testleri (Vitest)                                                                                                     |
| `npm run test:coverage`                                     | Testler ve kapsam raporu (eşik: satır %80, dal %70)                                                                                        |
| `npm run test:e2e`                                          | Uçtan uca testler (Playwright). Önce `npm run build`. Yerelde makinedeki Chrome kullanılır; Chrome yoksa `npx playwright install chromium` |
| `npm run migrate:latest` / `migrate:down` / `migrate:check` | Migrasyonları uygular / sonuncuyu geri alır / yukarı-aşağı-yukarı dener                                                                    |
| `npm run demo:load` / `npm run demo:clear`                  | Demo veriyi yükler / siler                                                                                                                 |
| `npm run backup`                                            | Veritabanı ve görsellerin yedeği (`backups/<zaman>/`)                                                                                      |
| `npm run restore -- backups/<klasör> --evet`                | Yedekten geri yükleme (uygulama durdurulmuş olmalı)                                                                                        |
| `npm run secrets:scan`                                      | Depoya girecek dosyalarda sır taraması (commit'ten önce ve CI'da)                                                                          |
| `npm run cleanup`                                           | Yetim görsel dosyaları, süresi dolmuş oturumlar, saklama süresi geçmiş mesajlar                                                            |

## Ortam değişkenleri

Tamamı [.env.example](.env.example) dosyasında açıklamalıdır.

| Değişken                        | Varsayılan              | Açıklama                                                                                                        |
| ------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                      | `http://localhost:3000` | Canonical, sitemap ve Open Graph adresleri                                                                      |
| `DATABASE_PATH`                 | `./data/app.sqlite`     | SQLite dosyası                                                                                                  |
| `UPLOAD_DIR`                    | `./storage/uploads`     | Yüklenen görseller (web kökü dışında)                                                                           |
| `COOKIE_SECURE`                 | production'da `true`    | Oturum çerezinde Secure bayrağı                                                                                 |
| `TRUST_PROXY`                   | `false`                 | Production'da ters vekil arkasında `true` olmalı; giriş ve form sınırları gerçek istemci IP'sine göre uygulanır |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | boş                     | Yalnızca `admin:create` için                                                                                    |

## Demo veri

`npm run demo:load` 3 hayali marka, 14 parfüm (12 yayında, 2 taslak) ve her parfüm için kendi ürettiğimiz nötr şişe çizimlerini yükler. Gerçek marka adı ya da telifli görsel içermez. Tekrar çalıştırmak önce eski demo kayıtlarını siler. `npm run demo:clear` tüm demo kayıtlarını ve görsel dosyalarını siler, ardından kalan demo kayıt sayılarını (hepsi 0) tablo olarak yazar. Demo marka, koku ailesi ya da notayı gerçek bir parfümde kullandıysanız o kayıt silinmez, gerçek kayda dönüştürülür.

## Yapılandırma (kod değiştirmeden)

- **Site ayarları** (`/admin/ayarlar`): site adı, ana sayfa başlığı ve metni, hakkımızda metni, WhatsApp numarası, telefon, e-posta, adres, çalışma saatleri, Instagram, KVKK veri sorumlusu unvanı. Varsayılanlar [src/config/site.ts](src/config/site.ts) dosyasındadır.
- **Ana sayfa vitrini**: parfüm formundaki "Ana sayfada öne çıkar" kutusu.
- **Markalar, koku aileleri, notalar**: panelde ayrı ekranlar. Notalar parfüm formunda yazıldığında otomatik eklenir.
- **Arayüz metinleri**: [src/i18n/tr.ts](src/i18n/tr.ts) dosyasında tek kaynakta.

## Panel kullanımı

1. Markalar ekranından marka ekleyin.
2. Parfümler > Yeni parfüm: ad, marka, açıklama ve diğer alanları doldurup "Taslak olarak oluştur".
3. Açılan sayfada görselleri yükleyin (JPEG, PNG, WebP; en fazla 5 MB, en fazla 8 görsel) ve her birine alternatif metin yazın.
4. Durumu "Yayında" yapıp kaydedin. Parfüm bir sonraki sayfa isteğinde vitrinde görünür (ölçülen süre 1 saniyenin altında).
5. Silinen parfümler "Silinenler" sekmesinden geri alınabilir.

## Yedekleme ve geri yükleme

```bash
npm run backup
```

Yedek, uygulama çalışırken de alınabilir (SQLite çevrimiçi yedekleme). `backups/<zaman>/` içinde `app.sqlite`, `uploads/` ve sayıları içeren `yedek.json` bulunur. Yedekleri sunucu dışında bir yere kopyalayın. Geri yüklemek için uygulamayı durdurun:

```bash
npm run restore -- backups/2026-11-06T08-30-07-692Z --evet
```

Mevcut veritabanı ve görseller silinmez, `.geri-yukleme-oncesi-<zaman>` ekiyle kenara alınır.

## Yayına alma notları

Canlıya alma bu işin kapsamında değildir; seçenekler ve geri alma planı [docs/plan.md](docs/plan.md) "Yayın planı" bölümündedir. Kısaca:

- Kalıcı diskli bir sunucu (VPS ya da diskli PaaS) gerekir; veritabanı ve görseller dosya sistemindedir.
- Önünde TLS sonlandıran bir ters vekil (Caddy, Nginx) olmalı, `TRUST_PROXY=true` yapılmalı ve vekil `X-Forwarded-For` başlığını eklemelidir. Vekilde brotli ya da gzip sıkıştırma açık olmalıdır.
- Günlük bakım için `npm run cleanup` ve `npm run backup` komutlarını zamanlanmış görev olarak çalıştırın.
- Her yayından önce yedek alın, ardından `npm run migrate:latest` çalıştırın.

## Hukuki not

KVKK aydınlatma metni ile gizlilik ve çerez politikası taslaktır. Site ayarlarındaki bilgilerle doldurulur; yayına almadan önce hukuki inceleme önerilir. Sitede ziyaretçi çerezi, analitik ya da üçüncü taraf izleyici yoktur. Bunlardan biri eklenirse onay bandı ve metin güncellemesi gerekir.

## Lisans

Tüm hakları saklıdır, bkz. [LICENSE](LICENSE). Başlık yazı tipi Fraunces, SIL Open Font License 1.1 ile dağıtılır ([public/fonts/Fraunces-OFL.txt](public/fonts/Fraunces-OFL.txt)).
