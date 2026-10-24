[English](README.md) | Türkçe

# Pati

Evcil hayvan sahipleri için mobil ve web uygulaması. Patilerini kaydediyorsun,
onlar için hatırlatıcılar kuruyorsun, kedinin miyavlamasını yükleyip ne
demek istediğine dair bir tahmin alıyorsun ve aklına takılanı chatbot'a
soruyorsun.

- **backend/**: FastAPI + SQLAlchemy, PostgreSQL
- **frontend/**: Expo (React Native), aynı kod hem mobilde hem web'de çalışıyor

## Özellikler

- E-posta doğrulamalı kayıt, giriş ve şifre sıfırlama (JWT)
- Pati ekleme, düzenleme, silme; ikon ya da fotoğraf avatarı
- Hatırlatıcılar ve geçmişi; hatırlatıcı tekrarlanabiliyor (her gün, her hafta, her ay, 3 ayda bir, her yıl)
- Push bildirimleri: hatırlatıcının günü gelince sunucu sahibin telefonlarına saat
  09:00'da (Türkiye saati) Expo push bildirimi gönderiyor
- Miyavlama analizi: ses ffmpeg ile çevrilip mel-spektrograma dönüştürülüyor,
  Keras modeli (`backend/app/ml_models/`) ruh hâlini tahmin ediyor
- Gemini tabanlı chatbot

Model dosyası ya da `GEMINI_API_KEY` yoksa uygulama çökmüyor: analiz örnek bir
sonuç, chatbot anahtar kelimeye göre hazır cevap dönüyor. Yerelde anahtarsız
geliştirebilmek için bilerek böyle.

## Mimari

```
frontend (Expo)  --HTTP/JSON-->  backend (FastAPI)  -->  PostgreSQL
                                   api -> services -> repositories -> models
```

| Katman | Dosya | Sorumluluk |
|--------|-------|------------|
| API | `backend/app/api.py` | Route'lar, istek ayrıştırma, kimlik bağımlılığı |
| Servisler | `backend/app/services.py` | İş kuralları, sahiplik kontrolleri |
| Repository'ler | `backend/app/repositories.py` | Veritabanı erişimi |
| Modeller | `backend/app/models.py` | SQLAlchemy tabloları |

Yardımcı modüller: `core.py` (JWT ve şifre hashleme), `mail.py` (Brevo /
Gmail), `llm.py` (Gemini istemcisi), `ml_model.py` (miyavlama sınıflandırıcısı),
`uploads.py` (görsel doğrulama ve saklama), `rate_limit.py` (giriş denemesi
sınırlayıcı).

## Çalıştırma

Tek komutla backend, web arayüzü ve PostgreSQL kalkar. `.env` şart değil,
anahtar vermek ya da port değiştirmek istersen örnekten kopyala:

```bash
cp .env.example .env   # opsiyonel
docker compose up --build
```

`docker-compose.override.yml` otomatik devreye girer: `backend/` klasörü
container'a bağlanır ve uvicorn `--reload` ile çalışır, kod değişince kendini
yeniler. Override olmadan, canlıdaki gibi çalıştırmak için:

```bash
docker compose -f docker-compose.yml up --build
```

Makinede zaten 5432'yi kullanan bir PostgreSQL varsa `DB_PORT=5433` ver.

| Servis | Adres |
|--------|-------|
| Backend | http://localhost:8000 (Swagger: `/docs`) |
| Web arayüzü | http://localhost:8081 |
| PostgreSQL | localhost:5432 |

Backend açılışta `scripts/safe_migrate.py` ile migration'ları uyguluyor.

Telefonda denemek için:

```bash
cd frontend
npm install
EXPO_PUBLIC_BACKEND_URL=http://<makinenin-ip>:8000 npx expo start
```

## Ortam değişkenleri

| Değişken | Not |
|----------|-----|
| `DATABASE_URL` | Compose kendisi veriyor |
| `JWT_SECRET_KEY` | **Canlıda zorunlu.** Boşsa zayıf bir geliştirme anahtarı kullanılıyor ve uyarı loglanıyor |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Chatbot; model varsayılanı `gemini-2.5-flash-lite` |
| `BREVO_API_KEY`, `MAIL_SENDER` | Mail HTTP üzerinden Brevo ile gider; tanımlıysa Gmail'e göre önceliklidir |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | Brevo yoksa SMTP ile Gmail'den gönderim |
| `ALLOWED_ORIGINS` | CORS origin'leri, virgülle ayrılır, varsayılan `*` |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | Pati fotoğraflarını yerel disk yerine S3 uyumlu nesne depolamada (Cloudflare R2, AWS S3, MinIO) tut; `S3_BUCKET` verilince dördü de gerekli |
| `REMINDER_NOTIFICATIONS` | `0` günlük hatırlatıcı bildirimlerini kapatır (varsayılan açık) |
| `REMINDER_NOTIFY_HOUR`, `REMINDER_TIMEZONE` | Bildirimlerin gittiği saat ve "bugün"ü belirleyen saat dilimi (varsayılan `9`, `Europe/Istanbul`) |
| `EXPO_ACCESS_TOKEN` | İsteğe bağlı; yalnızca Expo projesinde push güvenliği açıksa gerekir |
| `S3_ENDPOINT_URL`, `S3_REGION`, `S3_PREFIX` | İsteğe bağlı: R2/MinIO uç noktası (`https://<hesap>.r2.cloudflarestorage.com`), bölge (varsayılan `auto`), anahtar öneki (varsayılan `uploads`) |
| `EXPO_PUBLIC_BACKEND_URL` | Frontend'in konuşacağı backend adresi |
| `POSTGRES_PASSWORD`, `DB_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` | Sadece Compose: veritabanı şifresi ve host portları |

## Yayına alma

Uygulama Railway'de, aynı Dockerfile'larla çalışıyor. Railway dışarıya SMTP'yi
kapatıyor, Gmail yolu orada çalışmaz: `BREVO_API_KEY` ve `MAIL_SENDER` (Brevo'da
doğrulanmış gönderici adresi) tanımlanmalı, yoksa doğrulama ve sıfırlama
kodları kullanıcıya ulaşmaz. Kodlar hiçbir koşulda API yanıtında dönmez.

Yüklenen fotoğraflar varsayılan olarak `backend/static/uploads/` altına yazılıyor.
Compose bunları bir volume'da tutuyor, ama Railway container'ının diski kalıcı
değil; her deploy'da dosyalar kayboluyor. Ya o yola volume bağla ya da `S3_*`
değişkenlerini ver: fotoğraflar kovaya gider, veritabanına mutlak adresleri yazılır
(`S3_PUBLIC_BASE_URL` kovayı herkese açık sunmalı, ör. R2 public bucket ya da özel
alan adı). Geçişten önce yüklenenler `/static/uploads/...` yolunu korur. Yerine
yenisi yüklenen, ikonla değiştirilen ya da silinen patinin fotoğrafı depodan da
silinir.

Push bildirimleri için cihaz tarafı bir kez ayarlanmalı: Android derlemeleri için
FCM kimlik bilgileri EAS projesine yüklenmeli (`eas credentials`), iOS için APNs
anahtarı. Expo Go ve web sürümü bildirim almıyor. Bildirim işi API sürecinin
içinde çalışıyor ve 10 dakikada bir bakıyor; birden fazla replika varsa koşullu
bir güncelleme her hatırlatıcının günde bir kez gitmesini sağlıyor.

## Test

```bash
cd backend && pytest
cd frontend && npm run lint
```

CI (`.github/workflows/ci.yml`) her push'ta ikisini de çalıştırıyor.

## Güvenlik notları

- Canlıda `JWT_SECRET_KEY` ver. Token'lar HS256, 24 saat geçerli.
- Şifreler PBKDF2-HMAC-SHA256 hash'i olarak saklanıyor.
- Hatalı girişler her IP ve e-posta ikilisi için 15 dakikada 5 ile sınırlı
  (istemci IP'si `X-Real-IP` / `X-Forwarded-For`'dan alınıyor). Sayaçlar süreç
  belleğinde, yeniden başlatmada sıfırlanıyor.
- Doğrulama ve sıfırlama kodları 5 hatalı denemede geçersiz olur; şifre
  sıfırlama isteği aynı hesap için dakikada bir kez işlenir.
- Avatar yüklemesi yalnızca JPEG, PNG ve WEBP kabul ediyor, en fazla 5 MB. Görsel
  açılıp yeniden kodlanıyor (EXIF ve konum bilgisi atılıyor, uzun kenar 1024
  piksele indiriliyor) ve sunucuda üretilen bir adla saklanıyor. Statik dosyalar
  `X-Content-Type-Options: nosniff` ve sandbox'layan bir CSP ile sunuluyor.
- Pati, hatırlatıcı ve analiz uçlarının hepsi patinin giriş yapan kullanıcıya ait
  olduğunu kontrol ediyor.
- Canlıda `ALLOWED_ORIGINS`'i `*` yerine gerçek web adresine ayarla.
