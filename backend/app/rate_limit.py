import threading
import time
from collections import deque

from fastapi import HTTPException, Request

# slowapi yerine küçük bir sınırlayıcı: slowapi başarılı istekleri de sayıyor ve anahtarı
# IP'den alıyor; burada sadece hatalı denemeler sayılıyor ve anahtar IP + e-posta.
# Sayaçlar süreç belleğinde (tek uvicorn süreci); deploy/yeniden başlatmada sıfırlanır.
_MAX_TRACKED_KEYS = 10_000


class FailureLimiter:
    def __init__(self, max_failures: int, window_seconds: int):
        self._max_failures = max_failures
        self._window = window_seconds
        self._failures: dict[tuple, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: tuple) -> None:
        with self._lock:
            attempts = self._recent(key)
            if len(attempts) < self._max_failures:
                return
            retry_after = int(attempts[0] + self._window - time.monotonic()) + 1

        raise HTTPException(
            status_code=429,
            detail=f"Çok fazla hatalı deneme. {-(-retry_after // 60)} dakika sonra tekrar dene.",
            headers={"Retry-After": str(retry_after)},
        )

    def record_failure(self, key: tuple) -> None:
        with self._lock:
            if key not in self._failures and len(self._failures) >= _MAX_TRACKED_KEYS:
                self._evict()
            self._failures.setdefault(key, deque()).append(time.monotonic())

    def reset(self, key: tuple) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()

    def _recent(self, key: tuple) -> deque[float]:
        attempts = self._failures.get(key, deque())
        threshold = time.monotonic() - self._window
        while attempts and attempts[0] < threshold:
            attempts.popleft()
        if not attempts:
            self._failures.pop(key, None)
        return attempts

    def _evict(self) -> None:
        for key in list(self._failures):
            self._recent(key)
        if len(self._failures) >= _MAX_TRACKED_KEYS:
            # Hepsi hâlâ taze; en eski kaydı at, bellek sınırsız büyümesin
            self._failures.pop(next(iter(self._failures)))


def client_ip(request: Request) -> str:
    # Railway gibi bir proxy'nin arkasında request.client proxy'nin adresi olur, herkes tek IP
    # sayılırdı. Railway istemci IP'sini X-Real-IP'de iletiyor; yoksa X-Forwarded-For'un sonundaki
    # giriş alınır (baştakiler istemcinin yazdığı sahte değerler olabilir, sonuncuyu en yakın
    # proxy ekler).
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip
    last_hop = request.headers.get("x-forwarded-for", "").rsplit(",", 1)[-1].strip()
    if last_hop:
        return last_hop
    return request.client.host if request.client else "unknown"


login_limiter = FailureLimiter(max_failures=5, window_seconds=15 * 60)
