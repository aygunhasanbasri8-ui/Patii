import io
import os
import secrets

from fastapi import HTTPException
from PIL import Image, ImageOps

_APP_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(_APP_DIR, "..", "static", "uploads")
UPLOADS_URL_PREFIX = "/static/uploads"

MAX_AVATAR_BYTES = 5 * 1024 * 1024
# Küçük dosya çok büyük bir bitmap'e açılabilir (decompression bomb), bellek korunsun
_MAX_AVATAR_PIXELS = 40_000_000
_AVATAR_MAX_SIDE = 1024

# Dosya adına ve Content-Type'a bakılmıyor; istemci ikisini de yanlış (image/jpg gibi) gönderebiliyor.
# Tür, içeriği Pillow'un tanımasıyla belirleniyor.
_ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
_SAVE_OPTIONS = {
    "JPEG": {"quality": 85, "optimize": True},
    "PNG": {"optimize": True},
    "WEBP": {"quality": 85},
}


def sanitize_avatar(raw: bytes) -> tuple[bytes, str]:
    """Görseli doğrular, yeniden kodlar ve (bayt, uzantı) döner."""
    if len(raw) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Fotoğraf en fazla 5 MB olabilir.")

    try:
        image = Image.open(io.BytesIO(raw), formats=list(_ALLOWED_FORMATS))
    except Image.DecompressionBombError:
        raise HTTPException(status_code=400, detail="Fotoğrafın çözünürlüğü çok yüksek.")
    except (OSError, ValueError):
        raise HTTPException(status_code=415, detail="Sadece JPEG, PNG veya WEBP yüklenebilir.")

    fmt = image.format
    if image.width * image.height > _MAX_AVATAR_PIXELS:
        raise HTTPException(status_code=400, detail="Fotoğrafın çözünürlüğü çok yüksek.")

    try:
        # EXIF silineceği için yönü önce piksellere işle, yoksa fotoğraf yan dönüyor
        image = ImageOps.exif_transpose(image)
        image.thumbnail((_AVATAR_MAX_SIDE, _AVATAR_MAX_SIDE))
        if fmt == "JPEG" and image.mode != "RGB":
            image = image.convert("RGB")
        elif image.mode not in ("RGB", "RGBA", "L"):
            image = image.convert("RGBA")

        # Yeniden kodlayınca EXIF (konum dahil) ve gömülü metadata dosyaya taşınmıyor
        out = io.BytesIO()
        image.save(out, format=fmt, **_SAVE_OPTIONS[fmt])
    except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="Fotoğraf okunamadı, dosya bozuk olabilir.")

    return out.getvalue(), _ALLOWED_FORMATS[fmt]


def save_upload(data: bytes, prefix: str, ext: str) -> str:
    """Dosyayı sunucuda üretilen bir adla yazar, istemcinin kullanacağı yolu döner.

    Depolama (disk, S3/R2) değişirse değişmesi gereken tek yer burası.
    """
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    name = f"{prefix}_{secrets.token_hex(8)}.{ext}"
    with open(os.path.join(UPLOADS_DIR, name), "wb") as f:
        f.write(data)
    return f"{UPLOADS_URL_PREFIX}/{name}"
