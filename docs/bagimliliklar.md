# Bağımlılıklar, lisanslar ve gerekçeler

Sürümler 6 Kasım 2026'da npm kayıt defterinden doğrulandı; lisanslar kurulu paketlerin `package.json` dosyalarından okundu. Kilit dosyası `package-lock.json`; kurulum `npm ci` ile yapılır.

## Çalışma zamanı

| Paket            | Sürüm  | Lisans                                       | Gerekçe                                                     |
| ---------------- | ------ | -------------------------------------------- | ----------------------------------------------------------- |
| next             | 16.4.5 | MIT                                          | Uygulama çatısı: vitrin, panel ve API tek uygulamada        |
| react, react-dom | 19.3.1 | MIT                                          | Arayüz                                                      |
| kysely           | 0.29.8 | MIT                                          | Tip güvenli, parametrik sorgular; yukarı/aşağı migrasyon    |
| better-sqlite3   | 13.0.3 | MIT                                          | SQLite sürücüsü; hazır ikili, sunucu gerektirmez            |
| sharp            | 0.35.5 | Apache-2.0 (libvips LGPL-3.0, dinamik bağlı) | Görsel doğrulama, boyutlandırma, WebP/AVIF, meta veri silme |
| @node-rs/argon2  | 2.2.2  | MIT                                          | argon2id parola özeti                                       |
| zod              | 4.6.7  | MIT                                          | Sunucu ve istemcide aynı doğrulama şemaları                 |
| markdown-it      | 15.0.3 | MIT                                          | Açıklama biçimlendirme; ham HTML kapalı                     |
| lucide-react     | 1.70.0 | ISC                                          | İkonlar; yalnızca kullanılanlar pakete girer                |

## Geliştirme

| Paket                       | Sürüm             | Lisans     | Gerekçe                                                                                 |
| --------------------------- | ----------------- | ---------- | --------------------------------------------------------------------------------------- |
| typescript                  | 5.9.3             | Apache-2.0 | Tip denetimi (7.0 ekosistem uyumu doğrulanmadığı için 5.9)                              |
| eslint                      | 9.39.5            | MIT        | Lint. 10.x, eslint-config-next'in kullandığı eklentilerin eş bağımlılık aralığı dışında |
| eslint-config-next          | 16.4.5            | MIT        | Next.js, React, erişilebilirlik (jsx-a11y) kuralları                                    |
| prettier                    | 3.9.10            | MIT        | Biçimlendirme                                                                           |
| vitest, @vitest/coverage-v8 | 5.1.0             | MIT        | Birim ve entegrasyon testi, kapsam                                                      |
| @playwright/test            | 1.65.0            | Apache-2.0 | Uçtan uca test                                                                          |
| @axe-core/playwright        | 4.14.0            | MPL-2.0    | Otomatik erişilebilirlik denetimi                                                       |
| tsx                         | 4.23.15           | MIT        | TypeScript betiklerini çalıştırma                                                       |
| @types/*                    | bkz. package.json | MIT        | Tip tanımları                                                                           |

## Yazı tipi ve ikonlar

| Varlık                                               | Kaynak                                                    | Lisans                                                      | Sunum                         |
| ---------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------- |
| Fraunces (değişken, latin ve latin-ext alt kümeleri) | @fontsource-variable/fraunces 5.3.0 paketinden kopyalandı | SIL Open Font License 1.1 (`public/fonts/Fraunces-OFL.txt`) | Kendi sunucumuzdan, `/fonts/` |
| Gövde metni                                          | İşletim sisteminin yazı tipi (system-ui)                  | -                                                           | İndirme yok                   |
| İkonlar                                              | lucide-react                                              | ISC                                                         | Pakete gömülü SVG             |

Üçüncü taraf CDN, analitik ya da izleme betiği yoktur.

## Plandan sapmalar

- `@fontsource-variable/inter` ve `@fontsource-variable/fraunces` kaldırıldı. İlk Lighthouse ölçümünde dört font dosyası (yaklaşık 203 KB) CLS 0,34'e yol açtı. Gövde metni sistem yazı tipine geçti, Fraunces dosyaları `public/fonts` altına alındı.
- ESLint 10 yerine 9.39.5 kullanılıyor (eş bağımlılık uyumsuzluğu). npm 9.x için "artık desteklenmiyor" uyarısı veriyor; geçiş "Onay bekleyenler" listesinde.
- `file-type` ve `@dnd-kit/*` hiç eklenmedi (plan da eklememeyi öngörüyordu).
