"""Hatırlatıcı tarihleri ve tekrar kuralı.

Kural RRULE'un küçük bir alt kümesi: "FREQ=MONTHLY;INTERVAL=3" gibi, FREQ
DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL 1-24. Tam RRULE (BYDAY, COUNT...) şimdilik
gerekmiyor; bu biçimde saklandığı için ileride genişletmek veriyi bozmaz.
"""

import calendar
import os
from datetime import date, datetime
from zoneinfo import ZoneInfo

DATE_FORMAT = "%d/%m/%Y"
# Kullanıcıların çoğu Türkiye'de; "bugün" sunucunun UTC gününe göre değil buna göre
TIMEZONE = ZoneInfo(os.getenv("REMINDER_TIMEZONE", "Europe/Istanbul"))
_FREQS = ("DAILY", "WEEKLY", "MONTHLY", "YEARLY")
_MAX_INTERVAL = 24


def parse_reminder_date(value: str | None) -> date | None:
    """İstemcinin gönderdiği "gg/aa/yyyy" metnini tarihe çevirir; okunamazsa None."""
    try:
        return datetime.strptime((value or "").strip(), DATE_FORMAT).date()
    except ValueError:
        return None


def parse_rule(rule: str | None) -> tuple[str, int] | None:
    """Kuralı (FREQ, INTERVAL) olarak döner; boşsa None, geçersizse ValueError."""
    if not rule:
        return None
    parts = {}
    for item in rule.upper().split(";"):
        key, sep, value = item.partition("=")
        if not sep:
            raise ValueError(f"geçersiz tekrar kuralı: {rule}")
        parts[key.strip()] = value.strip()

    freq = parts.pop("FREQ", None)
    if freq not in _FREQS:
        raise ValueError(f"desteklenmeyen tekrar sıklığı: {freq}")
    try:
        interval = int(parts.pop("INTERVAL", "1"))
    except ValueError:
        raise ValueError("INTERVAL bir sayı olmalı") from None
    if not 1 <= interval <= _MAX_INTERVAL:
        raise ValueError(f"INTERVAL 1-{_MAX_INTERVAL} arasında olmalı")
    if parts:
        raise ValueError(f"desteklenmeyen alanlar: {', '.join(parts)}")
    return freq, interval


def normalize_rule(rule: str | None) -> str | None:
    parsed = parse_rule(rule)
    if parsed is None:
        return None
    freq, interval = parsed
    return f"FREQ={freq};INTERVAL={interval}"


def _add_months(day: date, months: int) -> date:
    month_index = day.month - 1 + months
    year, month = day.year + month_index // 12, month_index % 12 + 1
    # 31 Ocak + 1 ay = 28/29 Şubat; ay sonunu geçmesin
    return day.replace(year=year, month=month, day=min(day.day, calendar.monthrange(year, month)[1]))


def occurrence(start: date, rule: str, n: int) -> date:
    """Başlangıçtan itibaren n. tekrar (n=0 başlangıcın kendisi).

    Hep başlangıçtan sayılıyor; bir önceki tarihten sayılsaydı 31 Ocak aylık
    kuralı 28 Şubat'tan sonra 28 Mart'a kayardı.
    """
    freq, interval = parse_rule(rule)
    if freq == "DAILY":
        return date.fromordinal(start.toordinal() + interval * n)
    if freq == "WEEKLY":
        return date.fromordinal(start.toordinal() + 7 * interval * n)
    months = interval * n * (12 if freq == "YEARLY" else 1)
    return _add_months(start, months)


def first_on_or_after(start: date, rule: str, day: date) -> date:
    """Kuralın `day` gününe ya da sonrasına düşen ilk tekrarı."""
    if start >= day:
        return start
    freq, interval = parse_rule(rule)
    # Kaba bir tahminle başlayıp ileri sarıyoruz; döngü en fazla birkaç adım sürer
    if freq == "DAILY":
        n = (day - start).days // interval
    elif freq == "WEEKLY":
        n = (day - start).days // (7 * interval)
    else:
        months = (day.year - start.year) * 12 + day.month - start.month
        n = months // (interval * (12 if freq == "YEARLY" else 1))
    n = max(n - 1, 0)
    while occurrence(start, rule, n) < day:
        n += 1
    return occurrence(start, rule, n)


def format_reminder_date(day: date) -> str:
    return day.strftime(DATE_FORMAT)


def local_today() -> date:
    return datetime.now(TIMEZONE).date()
