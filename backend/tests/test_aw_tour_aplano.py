"""Tests for AW tour Aplano assignment helpers."""

from types import SimpleNamespace
from unittest.mock import patch

from app.models.route import Route
from app.services.aw_tour_aplano import (
    aplano_custom_text_for_area,
    map_planning_entries_to_aplano_lookup,
    serialize_routes,
)


def test_aplano_custom_text_for_area():
    assert aplano_custom_text_for_area("Nord") == "AW Nord"
    assert aplano_custom_text_for_area("Mitte") == "AW Mitte"
    assert aplano_custom_text_for_area("Süd") == "AW Süd"


def test_map_planning_entries_prefers_lowest_employee_id():
    entries = [
        SimpleNamespace(custom_text="AW Nord", weekday="saturday", employee_id=3),
        SimpleNamespace(custom_text="AW Nord", weekday="saturday", employee_id=9),
        SimpleNamespace(custom_text="AW Mitte", weekday="sunday", employee_id=12),
        SimpleNamespace(custom_text="Tour 1", weekday="monday", employee_id=1),
    ]
    assert map_planning_entries_to_aplano_lookup(entries) == {
        ("saturday", "Nord"): 3,
        ("sunday", "Mitte"): 12,
    }


def test_to_dict_uses_passed_aplano_lookup():
    route = Route()
    route.id = 1
    route.employee_id = 5
    route.employee_override = True
    route.weekday = "saturday"
    route.route_order = "[]"
    route.total_duration = 0
    route.custom_order = "[]"
    route.custom_order_active = False
    route.area = "Nord"
    route.calendar_week = 34
    route.created_at = None
    route.updated_at = None

    payload = route.to_dict(aplano_lookup={("saturday", "Nord"): 42})
    assert payload["aplano_employee_id"] == 42
    assert payload["employee_override"] is True


def test_serialize_routes_batches_lookup_once():
    route_a = Route()
    route_a.id = 1
    route_a.employee_id = None
    route_a.employee_override = False
    route_a.weekday = "saturday"
    route_a.route_order = "[]"
    route_a.total_duration = 0
    route_a.custom_order = "[]"
    route_a.custom_order_active = False
    route_a.area = "Nord"
    route_a.calendar_week = 34
    route_a.created_at = None
    route_a.updated_at = None

    route_b = Route()
    route_b.id = 2
    route_b.employee_id = 7
    route_b.employee_override = True
    route_b.weekday = "saturday"
    route_b.route_order = "[]"
    route_b.total_duration = 0
    route_b.custom_order = "[]"
    route_b.custom_order_active = False
    route_b.area = "Mitte"
    route_b.calendar_week = 34
    route_b.created_at = None
    route_b.updated_at = None

    lookup = {("saturday", "Nord"): 10, ("saturday", "Mitte"): 11}
    with patch(
        "app.services.aw_tour_aplano.build_aplano_aw_employee_lookups",
        return_value={34: lookup},
    ) as mock_build:
        payloads = serialize_routes([route_a, route_b])

    mock_build.assert_called_once_with({34})
    assert payloads[0]["aplano_employee_id"] == 10
    assert payloads[1]["aplano_employee_id"] == 11


def test_serialize_routes_skips_lookup_when_no_aw_routes():
    route = Route()
    route.id = 1
    route.employee_id = 1
    route.employee_override = False
    route.weekday = "monday"
    route.route_order = "[]"
    route.total_duration = 0
    route.custom_order = "[]"
    route.custom_order_active = False
    route.area = "Nordkreis"
    route.calendar_week = 34
    route.created_at = None
    route.updated_at = None

    with patch(
        "app.services.aw_tour_aplano.build_aplano_aw_employee_lookups",
        return_value={},
    ) as mock_build:
        payloads = serialize_routes([route])

    mock_build.assert_called_once_with(set())
    assert payloads[0]["aplano_employee_id"] is None
