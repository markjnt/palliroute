"""Apply Aplano AW tour assignments to Route.employee_id (with manual override support)."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from app import db
from app.models.employee_planning import EmployeePlanning
from app.models.route import Route
from app.services.holiday_service import is_aw_area_assignment_day
from app.services.route_utils import AW_TOUR_AREAS

# (weekday, area) -> employee_id
AplanoAwLookup = dict[tuple[str, str], int]


def aplano_custom_text_for_area(area: str) -> str:
    return f"AW {area}"


def map_planning_entries_to_aplano_lookup(
    entries: Iterable[EmployeePlanning],
) -> AplanoAwLookup:
    """
    Build (weekday, area) -> employee_id from planning rows.
    Entries must already be ordered by employee_id ascending (lowest id wins).
    """
    custom_texts = {aplano_custom_text_for_area(a): a for a in AW_TOUR_AREAS}
    lookup: AplanoAwLookup = {}
    for entry in entries:
        area = custom_texts.get(entry.custom_text or "")
        if area is None:
            continue
        key = (entry.weekday, area)
        if key not in lookup:
            lookup[key] = entry.employee_id
    return lookup


def build_aplano_aw_employee_lookup(calendar_week: int) -> AplanoAwLookup:
    """One query for all AW area assignees in a calendar week."""
    custom_texts = [aplano_custom_text_for_area(a) for a in AW_TOUR_AREAS]
    entries = (
        EmployeePlanning.query.filter(
            EmployeePlanning.calendar_week == calendar_week,
            EmployeePlanning.available.is_(True),
            EmployeePlanning.custom_text.in_(custom_texts),
        )
        .order_by(EmployeePlanning.employee_id.asc())
        .all()
    )
    return map_planning_entries_to_aplano_lookup(entries)


def build_aplano_aw_employee_lookups(
    calendar_weeks: Iterable[int],
) -> dict[int, AplanoAwLookup]:
    """One query for AW assignees across multiple calendar weeks."""
    weeks = sorted({int(w) for w in calendar_weeks})
    if not weeks:
        return {}
    custom_texts = [aplano_custom_text_for_area(a) for a in AW_TOUR_AREAS]
    entries = (
        EmployeePlanning.query.filter(
            EmployeePlanning.calendar_week.in_(weeks),
            EmployeePlanning.available.is_(True),
            EmployeePlanning.custom_text.in_(custom_texts),
        )
        .order_by(
            EmployeePlanning.calendar_week.asc(),
            EmployeePlanning.employee_id.asc(),
        )
        .all()
    )
    by_week: dict[int, list[EmployeePlanning]] = {w: [] for w in weeks}
    for entry in entries:
        if entry.calendar_week is not None:
            by_week.setdefault(int(entry.calendar_week), []).append(entry)
    return {w: map_planning_entries_to_aplano_lookup(rows) for w, rows in by_week.items()}


def resolve_aplano_aw_employee_id(
    calendar_week: int,
    weekday: str,
    area: str,
    *,
    lookup: AplanoAwLookup | None = None,
) -> int | None:
    """Employee planned for this AW area day in EmployeePlanning (from Aplano sync)."""
    if lookup is not None:
        return lookup.get((weekday, area))

    custom_text = aplano_custom_text_for_area(area)
    entry = (
        EmployeePlanning.query.filter_by(
            calendar_week=calendar_week,
            weekday=weekday,
            custom_text=custom_text,
            available=True,
        )
        .order_by(EmployeePlanning.employee_id.asc())
        .first()
    )
    return entry.employee_id if entry else None


def serialize_routes(routes: list[Route]) -> list[dict]:
    """Serialize routes with a single batched Aplano lookup (avoids N+1 in to_dict)."""
    weeks = {
        route.calendar_week
        for route in routes
        if route.calendar_week is not None and route.area in AW_TOUR_AREAS
    }
    lookups = build_aplano_aw_employee_lookups(weeks)
    result: list[dict] = []
    for route in routes:
        if route.calendar_week is not None and route.area in AW_TOUR_AREAS:
            result.append(route.to_dict(aplano_lookup=lookups.get(route.calendar_week, {})))
        else:
            result.append(route.to_dict())
    return result


def apply_aplano_aw_tour_employees(calendar_week: int) -> int:
    """
    Set Route.employee_id from Aplano planning for AW days when not manually overridden.
    Returns number of routes whose employee_id changed.
    """
    routes = Route.query.filter(
        Route.calendar_week == calendar_week,
        Route.area.in_(AW_TOUR_AREAS),
    ).all()

    lookup = build_aplano_aw_employee_lookup(calendar_week)
    updated = 0
    for route in routes:
        if route.employee_override:
            continue
        if not is_aw_area_assignment_day(calendar_week, route.weekday):
            continue
        aplano_id = resolve_aplano_aw_employee_id(
            calendar_week, route.weekday, route.area, lookup=lookup
        )
        if route.employee_id != aplano_id:
            route.employee_id = aplano_id
            route.updated_at = datetime.utcnow()
            updated += 1

    if updated:
        db.session.commit()
    return updated


def reset_aw_tour_employee_to_aplano(route: Route) -> int | None:
    """
    Clear manual override and set employee_id from current Aplano planning.
    Returns the aplano employee_id (may be None).
    """
    route.employee_override = False
    if route.calendar_week is None:
        route.employee_id = None
        return None
    aplano_id = resolve_aplano_aw_employee_id(route.calendar_week, route.weekday, route.area)
    route.employee_id = aplano_id
    route.updated_at = datetime.utcnow()
    return aplano_id
