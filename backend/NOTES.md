# Alembic — Şema Yönetimi

## Kurulum

```bash
pip install alembic
```

## Yeni migration oluşturma

Modellerde (app/models.py) değişiklik yaptıktan sonra:

```bash
alembic revision --autogenerate -m "kısa açıklama"
```

## Migration uygulama

```bash
alembic upgrade head
```

## Geri alma

```bash
alembic downgrade -1   # son migration'ı geri al
alembic downgrade base # tüm migration'ları geri al
```

## DATABASE_URL

`alembic/env.py` dosyası `DATABASE_URL` ortam değişkenini `app/db.py` ile
aynı mantıkla okur. Değişken tanımlı değilse SQLite (`pati.db`) kullanılır.

Docker'da `DATABASE_URL` environment ile PostgreSQL'e bağlanılır.

## Docker entrypoint önerisi

`docker-compose.yml` içindeki backend servisine aşağıdaki `command` eklenebilir;
bu sayede her container başlangıcında migration'lar otomatik uygulanır, ardından
uvicorn başlar:

```yaml
  backend:
    command: >
      sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
```

## Mevcut create_all() ile birlikte çalışma

`app/main.py` içindeki `Base.metadata.create_all()` startup olayında çalışmaya
devam eder. SQLite (geliştirme/test) ortamında tabloları `create_all` oluşturur;
PostgreSQL (production) ortamında ise `alembic upgrade head` önce çalıştırılmalı,
`create_all` zaten var olan tablolara dokunmaz (idempotent davranış).
