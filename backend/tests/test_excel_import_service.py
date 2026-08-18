"""Tests for Excel import helpers."""

import json

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


def test_aw_tour_employee_snapshot_roundtrip():
    snapshots = [(34, "saturday", "Nord", 7), (34, "sunday", "Mitte", 12)]
    raw = ExcelImportService._serialize_aw_tour_employee_snapshot(snapshots)
    assert ExcelImportService._deserialize_aw_tour_employee_snapshot(raw) == snapshots


def test_aw_tour_employee_snapshot_ignores_invalid_payload():
    assert ExcelImportService._deserialize_aw_tour_employee_snapshot(None) == []
    assert ExcelImportService._deserialize_aw_tour_employee_snapshot("not-json") == []
    assert ExcelImportService._deserialize_aw_tour_employee_snapshot(json.dumps({"x": 1})) == []
    assert (
        ExcelImportService._deserialize_aw_tour_employee_snapshot(
            json.dumps([{"calendar_week": 1, "weekday": "saturday"}])
        )
        == []
    )
