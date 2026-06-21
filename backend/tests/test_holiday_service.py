from datetime import date
from unittest.mock import patch

from app.services import holiday_service


def test_fetch_holidays_for_year_parses_api_response():
    api_payload = {
        "Neujahr": {"datum": "2026-01-01"},
        "Tag der Arbeit": {"datum": "2026-05-01"},
    }

    with patch("app.services.holiday_service.requests.get") as mock_get:
        mock_get.return_value.json.return_value = api_payload
        mock_get.return_value.raise_for_status.return_value = None

        holidays = holiday_service.fetch_holidays_for_year(2026)

    assert holidays[date(2026, 1, 1)] == "Neujahr"
    assert holidays[date(2026, 5, 1)] == "Tag der Arbeit"


def test_fetch_holidays_for_year_uses_cache():
    api_payload = {"Neujahr": {"datum": "2026-01-01"}}

    with patch("app.services.holiday_service.requests.get") as mock_get:
        mock_get.return_value.json.return_value = api_payload
        mock_get.return_value.raise_for_status.return_value = None

        first = holiday_service.fetch_holidays_for_year(2026)
        second = holiday_service.fetch_holidays_for_year(2026)

    assert first == second
    assert mock_get.call_count == 1
