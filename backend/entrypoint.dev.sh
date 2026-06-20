#!/bin/sh
set -e

echo "Veritabanı migration'ları uygulanıyor..."
alembic upgrade head

echo "Migration'lar tamam, uygulama başlatılıyor (dev modu, --reload)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload