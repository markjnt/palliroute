from app.models.route import Route, parse_appointment_ids, same_appointment_ids


def test_parse_appointment_ids_from_json_and_list():
    assert parse_appointment_ids("[1, 2, 3]") == [1, 2, 3]
    assert parse_appointment_ids([4, 5]) == [4, 5]
    assert parse_appointment_ids(None) == []
    assert parse_appointment_ids("not-json") == []


def test_same_appointment_ids_ignores_order():
    assert same_appointment_ids([1, 2, 3], [3, 1, 2])
    assert not same_appointment_ids([1, 2], [1, 2, 3])


def test_set_route_order_copies_custom_when_inactive():
    route = Route()
    route.custom_order_active = False
    route.polyline = "web"
    route.total_distance = 12.5
    route.total_duration = 80
    route.set_route_order([1, 2, 3])
    assert route.get_route_order() == [1, 2, 3]
    assert route.get_custom_order() == [1, 2, 3]
    assert route.custom_polyline == "web"
    assert route.custom_distance == 12.5
    assert route.custom_duration == 80


def test_set_route_order_keeps_custom_when_active():
    route = Route()
    route.custom_order_active = True
    route.set_custom_order([3, 1, 2], active=True)
    route.polyline = "web"
    route.set_route_order([1, 2, 3])
    assert route.get_route_order() == [1, 2, 3]
    assert route.get_custom_order() == [3, 1, 2]
    assert route.custom_order_active is True


def test_remove_and_append_membership():
    route = Route()
    route.custom_order_active = True
    route.set_route_order([1, 2, 3])
    route.set_custom_order([2, 1, 3], active=True)
    route.remove_appointment_id(2)
    assert route.get_route_order() == [1, 3]
    assert route.get_custom_order() == [1, 3]
    route.append_appointment_id(4)
    assert route.get_route_order() == [1, 3, 4]
    assert route.get_custom_order() == [1, 3, 4]


def test_append_when_inactive_copies_route_order():
    route = Route()
    route.custom_order_active = False
    route.set_route_order([1, 2])
    route.append_appointment_id(3)
    assert route.get_route_order() == [1, 2, 3]
    assert route.get_custom_order() == [1, 2, 3]


def test_reset_custom_order():
    route = Route()
    route.polyline = "opt"
    route.total_distance = 9
    route.total_duration = 40
    route.set_route_order([1, 2, 3])
    route.set_custom_order([3, 2, 1], active=True)
    route.reset_custom_order()
    assert route.custom_order_active is False
    assert route.get_custom_order() == [1, 2, 3]
    assert route.custom_polyline == "opt"
