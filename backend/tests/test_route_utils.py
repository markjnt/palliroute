from types import SimpleNamespace

import pytest

from app.services.route_utils import (
    calculate_route_duration,
    calculate_visit_duration,
    distance_km_to_area_start,
    get_tour_area_start_location,
    haversine_km,
)


def test_haversine_km_same_point_is_zero():
    assert haversine_km(51.0, 7.0, 51.0, 7.0) == pytest.approx(0.0)


def test_haversine_km_known_distance_is_positive():
    distance = haversine_km(50.9833022, 7.5412243, 51.11806869506836, 7.399380207061768)
    assert distance > 0


@pytest.mark.parametrize(
    ("area", "expected_lat"),
    [
        ("Nord", 51.11806869506836),
        ("Nordkreis", 51.11806869506836),
        ("Mitte", 50.9833022),
        ("Süd", 50.8775055),
        ("Unbekannt", 50.9833022),
    ],
)
def test_get_tour_area_start_location_normalizes_area(area: str, expected_lat: float):
    location = get_tour_area_start_location(area)
    assert location["lat"] == pytest.approx(expected_lat)
    assert "lng" in location


def test_distance_km_to_area_start_without_coordinates():
    assert distance_km_to_area_start(None, 7.0, "Mitte") is None


def test_calculate_route_duration():
    legs = [
        {"distance": {"value": 5000}, "duration": {"value": 600}},
        {"distance": {"value": 3000}, "duration": {"value": 300}},
    ]
    distance_km, duration_min = calculate_route_duration(legs)
    assert distance_km == pytest.approx(8.0)
    assert duration_min == 15


def test_calculate_visit_duration():
    appointments = [
        SimpleNamespace(visit_type="HB"),
        SimpleNamespace(visit_type="NA"),
        SimpleNamespace(visit_type="TK"),
    ]
    assert calculate_visit_duration(appointments) == 120
