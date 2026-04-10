# Python 3.10 tabanlı hafif bir imaj kullanıyoruz
FROM python:3.10-slim

# Çalışma dizinini ayarla
WORKDIR /app

# Gerekli sistem paketlerini yükle (PostgreSQL bağlantısı için)
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Bağımlılıkları kopyala ve yükle
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tüm kodları kopyala
COPY . .

# FastAPI'yi 8000 portunda başlat
CMD ["uvicorn", "main.py:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]