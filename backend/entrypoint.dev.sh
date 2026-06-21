#!/bin/sh
set -e

echo "Veritabanı migration'ları uygulanıyor..."
python scripts/safe_migrate.py

echo "Migration'lar tamam, uygulama başlatılıyor (dev modu, --reload)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload