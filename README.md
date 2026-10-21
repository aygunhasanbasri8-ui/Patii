# Pati

Evcil hayvan sahipleri için mobil ve web uygulaması. Patilerini kaydediyorsun,
onlar için hatırlatıcılar kuruyorsun, kedinin miyavlamasını yükleyip ne
demek istediğine dair bir tahmin alıyorsun ve aklına takılanı chatbot'a
soruyorsun.

- **backend/**: FastAPI + SQLAlchemy, PostgreSQL
- **frontend/**: Expo (React Native), aynı kod hem mobilde hem web'de çalışıyor

## Özellikler

- E-posta doğrulamalı kayıt, giriş ve şifre sıfırlama (JWT)
- Pati ekleme, düzenleme, silme ve avatar yükleme
- Hatırlatıcılar ve geçmişi
- Miyavlama analizi: ses ffmpeg ile çevrilip mel-spektrograma dönüştürülüyor,
  Keras modeli (`backend/app/ml_models/`) ruh hâlini tahmin ediyor
- Gemini tabanlı chatbot

Model dosyası ya da `GEMINI_API_KEY` yoksa uygulama çökmüyor: analiz örnek bir
sonuç, chatbot anahtar kelimeye göre hazır cevap dönüyor. Yerelde anahtarsız
geliştirebilmek için bilerek böyle.

## Çalıştırma

Kök dizine bir `.env` koy:

```
POSTGRES_PASSWORD=...
JWT_SECRET_KEY=...
GEMINI_API_KEY=...        # opsiyonel
BREVO_API_KEY=...         # mail gönderimi (Railway'de zorunlu)
MAIL_SENDER=...
GMAIL_ADDRESS=...         # Brevo yoksa yerelde SMTP ile gönderim
GMAIL_APP_PASSWORD=...
```

```bash
docker compose up --build
```

| Servis | Adres |
|--------|-------|
| Backend | http://localhost:8000 (Swagger: `/docs`) |
| Web arayüzü | http://localhost:8081 |
| PostgreSQL | localhost:5432 |

Backend açılışta `scripts/safe_migrate.py` ile migration'ları uyguluyor.

Mobilde denemek için:

```bash
cd frontend
npm install
EXPO_PUBLIC_BACKEND_URL=http://<makinenin-ip>:8000 npx expo start
```

## Ortam değişkenleri

| Değişken | |
|----------|---|
| `DATABASE_URL` | Compose kendisi veriyor |
| `JWT_SECRET_KEY` | Boşsa zayıf bir geliştirme anahtarına düşüyor, canlıda mutlaka ver |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Chatbot; model varsayılanı `gemini-2.5-flash-lite` |
| `BREVO_API_KEY`, `MAIL_SENDER` | Mail HTTP üzerinden Brevo ile gider; tanımlıysa Gmail'e göre önceliklidir |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | Brevo yoksa SMTP ile Gmail'den gönderim |
| `ALLOWED_ORIGINS` | CORS, varsayılan `*` |
| `EXPO_PUBLIC_BACKEND_URL` | Frontend'in konuşacağı backend adresi |

## Railway notu

Railway dışarıya SMTP'yi kapatıyor, Gmail yolu orada çalışmaz. Railway'de
`BREVO_API_KEY` ve `MAIL_SENDER` (Brevo'da doğrulanmış gönderici adresi)
tanımlanmalı, yoksa doğrulama ve sıfırlama kodları kullanıcıya ulaşmaz. Kodlar
hiçbir koşulda API yanıtında dönmez.

Doğrulama ve sıfırlama kodları 5 hatalı denemede geçersiz olur, yeni kod
istemek gerekir. Şifre sıfırlama isteği aynı hesap için dakikada bir kez
işlenir.

## Test

```bash
cd backend && pytest
cd frontend && npm run lint
```

CI (`.github/workflows/ci.yml`) her push'ta ikisini de çalıştırıyor.
