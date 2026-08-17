"""Normalize names for Entra email local-part matching (vorname.nachname@domain)."""

from __future__ import annotations

import re
import unicodedata

_UMLAUT_MAP = str.maketrans(
    {
        "ä": "ae",
        "ö": "oe",
        "ü": "ue",
        "ß": "ss",
        "Ä": "ae",
        "Ö": "oe",
        "Ü": "ue",
    }
)


def normalize_email_local(part: str) -> str:
    """Normalize a name part for email local-part matching (vorname.nachname)."""
    s = (part or "").strip().translate(_UMLAUT_MAP).lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace(" ", "")
    s = re.sub(r"[^a-z0-9.-]", "", s)
    s = re.sub(r"[.-]{2,}", ".", s).strip(".-")
    return s


def expected_entra_email(first_name: str, last_name: str, domain: str) -> str | None:
    local_first = normalize_email_local(first_name)
    local_last = normalize_email_local(last_name)
    if not local_first or not local_last or not domain:
        return None
    return f"{local_first}.{local_last}@{domain.strip().lower()}"
