"""Tests for Excel import helpers."""

from app.services.excel_import_service import ExcelImportService


def test_address_cache_key_normalization():
    key = ExcelImportService._address_cache_key("Hauptstr. 1", "51545", "Waldbröl")
    assert key == "hauptstr. 1, 51545 waldbröl, germany"


def test_batch_geocode_uses_cache_without_api(monkeypatch):
    ExcelImportService._geocode_cache.clear()
    ExcelImportService._geocode_cache[
        ExcelImportService._address_cache_key("A", "51545", "Waldbröl")
    ] = (50.9, 7.6)

    def fail_geocode(*_args, **_kwargs):
        raise AssertionError("geocode_address should not be called for cached address")

    monkeypatch.setattr(ExcelImportService, "geocode_address", fail_geocode)
    results = ExcelImportService.batch_geocode_addresses([("A", "51545", "Waldbröl")])
    assert results[("A", "51545", "Waldbröl")] == (50.9, 7.6)
