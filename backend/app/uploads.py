import io
import logging
import os
import secrets

from fastapi import HTTPException
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

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


class _LocalStorage:
    """Dosyayı static/uploads altına yazar. Railway diski kalıcı değil, deploy'da silinir."""

    def save(self, data: bytes, name: str, content_type: str) -> str:
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        with open(os.path.join(UPLOADS_DIR, name), "wb") as f:
            f.write(data)
        return f"{UPLOADS_URL_PREFIX}/{name}"

    def delete(self, url: str) -> None:
        if not url.startswith(UPLOADS_URL_PREFIX + "/"):
            return
        # Ad DB'den geliyor ama yine de klasör dışına çıkılmasın
        name = os.path.basename(url)
        try:
            os.remove(os.path.join(UPLOADS_DIR, name))
        except FileNotFoundError:
            pass


class _S3Storage:
    """S3 uyumlu depolama (Cloudflare R2, AWS S3, MinIO).

    Kova herkese açık okunabilir (ya da önünde bir CDN/özel alan adı) olmalı;
    DB'ye S3_PUBLIC_BASE_URL ile başlayan mutlak adres yazılıyor.
    """

    def __init__(self, bucket: str, public_base_url: str, prefix: str):
        import boto3  # yerel diskle çalışırken bağımlılık yüklenmesin

        self._client = boto3.client(
            "s3",
            endpoint_url=os.getenv("S3_ENDPOINT_URL") or None,
            aws_access_key_id=os.environ["S3_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["S3_SECRET_ACCESS_KEY"],
            region_name=os.getenv("S3_REGION") or "auto",
        )
        self._bucket = bucket
        self._base = public_base_url.rstrip("/")
        self._prefix = prefix.strip("/")

    def _key(self, name: str) -> str:
        return f"{self._prefix}/{name}" if self._prefix else name

    def save(self, data: bytes, name: str, content_type: str) -> str:
        key = self._key(name)
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            # Ad her yüklemede değiştiği için içerik hiç değişmiyor, uzun önbellek güvenli
            CacheControl="public, max-age=31536000, immutable",
        )
        return f"{self._base}/{key}"

    def delete(self, url: str) -> None:
        if not url.startswith(self._base + "/"):
            return
        self._client.delete_object(Bucket=self._bucket, Key=url[len(self._base) + 1:])


_storage = None


def _get_storage():
    global _storage
    if _storage is None:
        bucket = os.getenv("S3_BUCKET")
        if bucket:
            _storage = _S3Storage(bucket, os.environ["S3_PUBLIC_BASE_URL"], os.getenv("S3_PREFIX", "uploads"))
        else:
            _storage = _LocalStorage()
    return _storage


_CONTENT_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def save_upload(data: bytes, prefix: str, ext: str) -> str:
    """Dosyayı sunucuda üretilen bir adla saklar, istemcinin kullanacağı adresi döner.

    S3_BUCKET tanımlıysa S3/R2'ye, değilse yerel diske yazılır.
    """
    name = f"{prefix}_{secrets.token_hex(8)}.{ext}"
    return _get_storage().save(data, name, _CONTENT_TYPES.get(ext, "application/octet-stream"))


def delete_upload(url: str | None) -> None:
    """Artık kullanılmayan bir yüklemeyi siler; bizim üretmediğimiz adreslere dokunmaz.

    Hata yutuluyor: eski dosyanın silinememesi kullanıcının işlemini bozmamalı.
    """
    if not url:
        return
    try:
        _get_storage().delete(url)
    except Exception:
        logger.warning("Eski yükleme silinemedi: %s", url, exc_info=True)
