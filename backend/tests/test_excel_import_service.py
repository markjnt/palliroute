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
    snapshots = [
        (34, "saturday", "Nord", 7, False),
        (34, "sunday", "Mitte", 12, True),
    ]
    raw = ExcelImportService._serialize_aw_tour_employee_snapshot(snapshots)
    assert ExcelImportService._deserialize_aw_tour_employee_snapshot(raw) == snapshots


def test_aw_tour_employee_snapshot_legacy_defaults_override_true():
    raw = json.dumps(
        [{"calendar_week": 34, "weekday": "saturday", "area": "Nord", "employee_id": 7}]
    )
    assert ExcelImportService._deserialize_aw_tour_employee_snapshot(raw) == [
        (34, "saturday", "Nord", 7, True)
    ]


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


def test_custom_order_snapshot_roundtrip():
    snapshots = [
        {
            "calendar_week": 34,
            "weekday": "monday",
            "employee_id": 7,
            "area": None,
            "active": True,
            "stops": [
                {
                    "first_name": "Anna",
                    "last_name": "Arzt",
                    "street": "Hauptstr. 1",
                    "zip_code": "51545",
                    "visit_type": "HB",
                }
            ],
        }
    ]
    raw = ExcelImportService._serialize_custom_order_snapshot(snapshots)
    assert ExcelImportService._deserialize_custom_order_snapshot(raw) == snapshots


def test_custom_order_snapshot_ignores_invalid_payload():
    assert ExcelImportService._deserialize_custom_order_snapshot(None) == []
    assert ExcelImportService._deserialize_custom_order_snapshot("not-json") == []
    assert ExcelImportService._deserialize_custom_order_snapshot(json.dumps({"x": 1})) == []
    assert (
        ExcelImportService._deserialize_custom_order_snapshot(json.dumps([{"weekday": "monday"}]))
        == []
    )


def test_match_custom_order_keeps_remaining_stops_and_appends_new():
    identity_anna = ExcelImportService._normalize_stop_identity(
        "Anna", "Arzt", "Hauptstr. 1", "51545", "HB"
    )
    identity_bernd = ExcelImportService._normalize_stop_identity(
        "Bernd", "Becker", "Nebenweg 2", "51545", "HB"
    )
    identity_clara = ExcelImportService._normalize_stop_identity(
        "Clara", "Conrad", "Berg 3", "51545", "NA"
    )
    current_ids = [10, 11, 12]
    identity_by_id = {
        10: identity_anna,
        11: identity_bernd,
        12: identity_clara,
    }
    snapshot_stops = [
        {
            "first_name": "Clara",
            "last_name": "Conrad",
            "street": "Berg 3",
            "zip_code": "51545",
            "visit_type": "NA",
        },
        {
            "first_name": "Anna",
            "last_name": "Arzt",
            "street": "Hauptstr. 1",
            "zip_code": "51545",
            "visit_type": "HB",
        },
        {
            "first_name": "Weg",
            "last_name": "Verschoben",
            "street": "Alte 9",
            "zip_code": "51545",
            "visit_type": "HB",
        },
    ]
    assert ExcelImportService._match_custom_order_ids(
        current_ids, identity_by_id, snapshot_stops
    ) == [12, 10, 11]


def test_match_custom_order_is_case_insensitive():
    identity = ExcelImportService._normalize_stop_identity(
        "Anna", "Arzt", "Hauptstr. 1", "51545", "HB"
    )
    snapshot_stops = [
        {
            "first_name": "ANNA",
            "last_name": "arzt",
            "street": " hauptstr. 1 ",
            "zip_code": "51545",
            "visit_type": "hb",
        }
    ]
    assert ExcelImportService._match_custom_order_ids([5], {5: identity}, snapshot_stops) == [5]


def test_completed_appointments_snapshot_roundtrip():
    snapshots = [
        {
            "calendar_week": 34,
            "weekday": "monday",
            "first_name": "Anna",
            "last_name": "Arzt",
            "street": "Hauptstr. 1",
            "zip_code": "51545",
            "visit_type": "HB",
        }
    ]
    raw = ExcelImportService._serialize_completed_appointments_snapshot(snapshots)
    assert ExcelImportService._deserialize_completed_appointments_snapshot(raw) == snapshots


def test_completed_appointments_snapshot_ignores_invalid_payload():
    assert ExcelImportService._deserialize_completed_appointments_snapshot(None) == []
    assert ExcelImportService._deserialize_completed_appointments_snapshot("not-json") == []
    assert (
        ExcelImportService._deserialize_completed_appointments_snapshot(json.dumps({"x": 1})) == []
    )
    assert (
        ExcelImportService._deserialize_completed_appointments_snapshot(
            json.dumps([{"weekday": "monday"}])
        )
        == []
    )


def test_completion_identity_includes_week_and_weekday():
    identity = ExcelImportService._normalize_completion_identity(
        34, "Monday", "Anna", "Arzt", "Hauptstr. 1", "51545", "hb"
    )
    assert identity == (
        34,
        "monday",
        "anna",
        "arzt",
        "hauptstr. 1",
        "51545",
        "HB",
    )
    assert (
        ExcelImportService._normalize_completion_identity(None, "monday", "A", "B", "C", "1", "HB")
        is None
    )
    assert (
        ExcelImportService._completion_identity_from_dict(
            {
                "calendar_week": 34,
                "weekday": "monday",
                "first_name": "Anna",
                "last_name": "Arzt",
                "street": "Hauptstr. 1",
                "zip_code": "51545",
                "visit_type": "HB",
            }
        )
        == identity
    )
