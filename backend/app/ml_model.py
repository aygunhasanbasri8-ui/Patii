import json
import logging
import os
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent / "ml_models"
MODEL_PATH = MODEL_DIR / "pati_meow_model.h5"
LABELS_PATH = MODEL_DIR / "label_classes.json"

SAMPLE_RATE = 22050
DURATION_SECONDS = 3.0
N_MELS = 64
FIXED_LEN = int(SAMPLE_RATE * DURATION_SECONDS)

# Eğitim notebook'undaki ham sınıf etiketlerinden (LabelEncoder sırasıyla
# alfabetik: Ac, Huzursuz, Sakin) kullanıcıya gösterilecek Türkçe metne
# ve öneriye eşleme. Notebook'taki LABEL_MAP ile birebir tutarlı olmalı.
LABEL_DISPLAY = {
    "Ac": {
        "result": "Acıktım, mama ver!",
        "advice": "Son besleme saatinin üzerinden çok zaman geçmiş olabilir, mama kabını kontrol et.",
    },
    "Huzursuz": {
        "result": "Huzursuzum, yalnız hissediyorum.",
        "advice": "Ortam değişikliği veya yalnız kalma kediyi tedirgin edebilir, biraz vakit geçirmeyi dene.",
    },
    "Sakin": {
        "result": "Sakinim, kendimi iyi hissediyorum.",
        "advice": "Her şey yolunda görünüyor, böyle devam edebilirsin.",
    },
}

_model = None
_labels: list[str] | None = None


def is_model_available() -> bool:
    return _model is not None and _labels is not None


def load_model() -> None:
    """FastAPI startup event'inden çağrılır. Dosyalar yoksa sessizce
    stub moduna düşer (uygulamayı çökertmez)."""
    global _model, _labels

    if not MODEL_PATH.exists() or not LABELS_PATH.exists():
        logger.warning(
            "Miyavlama analiz modeli bulunamadı (%s). Stub modunda çalışılacak.",
            MODEL_DIR,
        )
        return

    try:
        # TensorFlow import'u burada (fonksiyon içinde) yapılıyor; bu sayede
        # model dosyaları yoksa TensorFlow'un ağır import maliyetine hiç
        # girilmez ve paket kurulu değilse de uygulamanın geri kalanı çalışır.
        import tensorflow as tf

        _model = tf.keras.models.load_model(str(MODEL_PATH))
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            _labels = json.load(f)
        logger.info("Miyavlama analiz modeli yüklendi. Sınıflar: %s", _labels)
    except Exception as exc:
        logger.error("Model yüklenirken hata oluştu, stub moduna düşülüyor: %s", exc)
        _model = None
        _labels = None


def _extract_melspectrogram(file_bytes: bytes) -> np.ndarray:
    import io

    import librosa

    y, sr = librosa.load(io.BytesIO(file_bytes), sr=SAMPLE_RATE)
    if len(y) > FIXED_LEN:
        y = y[:FIXED_LEN]
    else:
        y = np.pad(y, (0, FIXED_LEN - len(y)))

    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=N_MELS)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_norm = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-9)
    return mel_norm.astype(np.float32)


def predict_from_audio(file_bytes: bytes) -> dict:
    """Ses byte'larından tahmin döner: {"label", "result", "advice", "confidence"}.
    Model yüklenmemişse RuntimeError fırlatır; çağıran taraf (services.py)
    bunu yakalayıp stub davranışına düşmelidir."""
    if not is_model_available():
        raise RuntimeError("Model yüklü değil.")

    mel = _extract_melspectrogram(file_bytes)
    batch = mel[np.newaxis, ..., np.newaxis]  # (1, n_mels, time, 1)

    predictions = _model.predict(batch, verbose=0)[0]
    best_idx = int(np.argmax(predictions))
    label = _labels[best_idx]
    confidence = float(predictions[best_idx])

    display = LABEL_DISPLAY.get(label, {"result": label, "advice": ""})
    return {
        "label": label,
        "result": display["result"],
        "advice": display["advice"],
        "confidence": round(confidence, 4),
    }