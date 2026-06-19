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

    "KediDegil": {
        "result": "Bu bir kedi miyavlaması gibi görünmüyor.",
        "advice": "Net bir kedi sesi kaydedip tekrar dener misin? Ortamın sessiz olması doğruluğu artırır.",
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

        import tensorflow as tf

        _model = tf.keras.models.load_model(str(MODEL_PATH))
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            _labels = json.load(f)
        logger.info(
            "Miyavlama analiz modeli yüklendi. Sınıflar: %s | input_shape: %s",
            _labels,
            _model.input_shape,
        )
    except Exception as exc:
        logger.error("Model yüklenirken hata oluştu, stub moduna düşülüyor: %s", exc)
        _model = None
        _labels = None


def _extract_melspectrogram(file_bytes: bytes) -> np.ndarray:
    import os
    import subprocess
    import tempfile

    import librosa

    # audioread'in ffmpeg entegrasyonu güvenilmez; ffmpeg'i doğrudan çağırıp
    # her format (CAF, M4A, AAC, WAV) için standart WAV üretiyoruz.
    in_fd, in_path = tempfile.mkstemp(suffix=".audio")
    out_fd, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(in_fd)
    os.close(out_fd)
    try:
        with open(in_path, "wb") as f:
            f.write(file_bytes)
        import shutil
        ffmpeg_bin = shutil.which("ffmpeg") or "/usr/bin/ffmpeg"
        try:
            subprocess.run(
                [ffmpeg_bin, "-y", "-i", in_path, "-ar", str(SAMPLE_RATE), "-ac", "1", "-f", "wav", out_path],
                check=True,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as ffmpeg_err:
            stderr = getattr(ffmpeg_err, "stderr", b"")
            logger.error(
                "ffmpeg dönüşümü başarısız (%s): %s",
                type(ffmpeg_err).__name__,
                stderr.decode(errors="replace") if stderr else str(ffmpeg_err),
            )
            raise
        y, sr = librosa.load(out_path, sr=SAMPLE_RATE)
    finally:
        for p in (in_path, out_path):
            try:
                os.unlink(p)
            except OSError:
                pass
    if len(y) > FIXED_LEN:
        y = y[:FIXED_LEN]
    else:
        y = np.pad(y, (0, FIXED_LEN - len(y)))

    mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=N_MELS)
    mel_db = librosa.power_to_db(mel, ref=np.max)
    mel_norm = (mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-9)
    return mel_norm.astype(np.float32)


LOW_CONFIDENCE_THRESHOLD = 0.45


def predict_from_audio(file_bytes: bytes) -> dict:
    """Ses byte'larından tahmin döner:
    {"label", "result", "advice", "confidence", "probabilities"}.
    "probabilities", her sınıfın etiketiyle olasılığını eşleyen bir sözlük
    döndürür (örn. {"Ac": 0.62, "Huzursuz": 0.23, "Sakin": 0.15}) — bu,
    modelin tek bir "kesin" cevap yerine ne kadar net/kararsız olduğunu
    şeffaf şekilde göstermek için kullanılır.
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
    probabilities = {
        lbl: round(float(prob), 4) for lbl, prob in zip(_labels, predictions)
    }

    if confidence < LOW_CONFIDENCE_THRESHOLD:
        return {
            "label": "Belirsiz",
            "result": "Net bir miyavlama tespit edemedim.",
            "advice": "Kaydın net bir kedi sesi içerdiğinden ve ortamın sessiz olduğundan emin olup tekrar dener misin?",
            "confidence": round(confidence, 4),
            "probabilities": probabilities,
        }

    display = LABEL_DISPLAY.get(label, {"result": label, "advice": ""})
    return {
        "label": label,
        "result": display["result"],
        "advice": display["advice"],
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
    }