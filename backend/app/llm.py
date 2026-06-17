import logging
import os

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash-lite"

_client = None
_client_init_attempted = False


def _get_client():

    global _client, _client_init_attempted

    if _client is not None:
        return _client
    if _client_init_attempted:
        return None

    _client_init_attempted = True
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY tanımlı değil. LLM özellikleri stub moduna düşecek.")
        return None

    try:
        from google import genai

        _client = genai.Client(api_key=api_key)
        logger.info("Gemini LLM istemcisi başlatıldı (%s).", GEMINI_MODEL)
        return _client
    except Exception as exc:
        logger.error("Gemini istemcisi başlatılamadı, stub moduna düşülüyor: %s", exc)
        return None


def is_available() -> bool:
    return _get_client() is not None


def generate_text(prompt: str, max_output_tokens: int = 300) -> str | None:
    client = _get_client()
    if client is None:
        return None

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"max_output_tokens": max_output_tokens},
        )
        text = (response.text or "").strip()
        return text or None
    except Exception as exc:
        logger.warning("Gemini çağrısı başarısız oldu, stub'a düşülüyor: %s", exc)
        return None