"""
Load all data required for the CP-SAT planning model:
time range (planning month + previous month), shift instances, employees with roles,
employee capacities, and existing assignments (for RESPECT).
"""

from calendar import monthrange
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from app import db
from app.models.employee import Employee
from app.models.scheduling import Assignment, EmployeeCapacity, ShiftDefinition, ShiftInstance

from .roles import ROLE_DOCTOR, ROLE_NURSING, employee_role

# Canonical area names used by shift definitions; employee area may be "Nordkreis" etc.
_AREA_ALIASES = {
    "nord": "Nord",
    "nordkreis": "Nord",
    "süd": "Süd",
    "sued": "Süd",
    "südkreis": "Süd",
    "suedkreis": "Süd",
    "mitte": "Mitte",
}


def _normalize_area(value: str | None) -> str | None:
    """Normalize area string to canonical form (Nord, Süd, Mitte) for comparison."""
    if not value or not (s := value.strip()):
        return None
    key = s.lower()
    # Unbekannte Gebiete: immer lowercase, damit Vergleiche (z. B. MA vs. Schicht) nicht an der Schreibung scheitern.
    return _AREA_ALIASES.get(key, key)


def _get_calendar_week(d: date) -> int:
    return d.isocalendar()[1]


@dataclass
class EmployeePlanningPreference:
    """Per-employee settings for a single auto-planning run."""

    employee_id: int
    included: bool = True
    rb_even_weeks: bool = True
    rb_odd_weeks: bool = True
    duty_preference: str = "neutral"  # neutral | aw | rb
    aw_rhythm: str = "regular"  # regular | irregular


def parse_employee_preferences(
    raw: list[dict[str, Any]] | None,
) -> dict[int, EmployeePlanningPreference] | None:
    """Parse and validate employee_preferences from API request."""
    if raw is None:
        return None
    out: dict[int, EmployeePlanningPreference] = {}
    for item in raw:
        if not isinstance(item, dict):
            continue
        employee_id = item.get("employee_id")
        if employee_id is None:
            continue
        try:
            eid = int(employee_id)
        except (TypeError, ValueError):
            continue
        duty_pref = str(item.get("duty_preference", "neutral")).lower()
        if duty_pref not in ("neutral", "aw", "rb"):
            duty_pref = "neutral"
        aw_rhythm = str(item.get("aw_rhythm", "regular")).lower()
        if aw_rhythm not in ("regular", "irregular"):
            aw_rhythm = "regular"
        out[eid] = EmployeePlanningPreference(
            employee_id=eid,
            included=bool(item.get("included", True)),
            rb_even_weeks=bool(item.get("rb_even_weeks", True)),
            rb_odd_weeks=bool(item.get("rb_odd_weeks", True)),
            duty_preference=duty_pref,
            aw_rhythm=aw_rhythm,
        )
    return out if out else None


@dataclass
class PlanableEmployee:
    """Employee included in the solver with index, role, optional area and optional home coordinates."""

    index: int
    id: int
    role: str  # NURSING | DOCTOR
    area: str | None = None  # Nord, Süd, Mitte oder None (Stammbereich)
    latitude: float | None = None  # Wohnort für Distanz zum Tour-Start
    longitude: float | None = None


@dataclass
class ShiftInfo:
    """Shift instance with definition cached for solver."""

    index: int
    id: int
    date: date
    calendar_week: int
    month: str
    category: str
    role: str
    area: str
    time_of_day: str
    is_weekday: bool
    is_weekend: bool


def _pick_single_external_shift(
    candidates: list[int],
    e_idx: int,
    shift_infos: list[ShiftInfo],
    employees: list[PlanableEmployee],
) -> int | None:
    """Pick exactly one shift index when Aplano maps to multiple DB slots (e.g. area unknown)."""
    if not candidates:
        return None
    uniq = sorted(set(candidates), key=lambda i: shift_infos[i].id)
    if len(uniq) == 1:
        return uniq[0]
    emp_area = employees[e_idx].area if 0 <= e_idx < len(employees) else None
    if emp_area:
        emp_key = _normalize_area(emp_area)
        for s_idx in uniq:
            if _normalize_area(shift_infos[s_idx].area) == emp_key:
                return s_idx
    return uniq[0]


@dataclass
class PlanningContext:
    """All input data for one planning run."""

    planning_month: str  # YYYY-MM
    start_date: date
    end_date: date
    prev_month_start: date
    prev_month_end: date
    employees: list[PlanableEmployee] = field(default_factory=list)
    shifts: list[ShiftInfo] = field(default_factory=list)
    # employee_id -> { capacity_type -> max_count } for planning month
    capacity_max: dict[int, dict[str, int]] = field(default_factory=dict)
    # fixed (e_idx, s_idx) when existing_assignments_handling == RESPECT
    fixed_assignments: set[tuple[int, int]] = field(default_factory=set)
    # Soft preferences (typically Aplano previous-month history), not hard constraints.
    preferred_assignments: set[tuple[int, int]] = field(default_factory=set)
    # employee_id -> e_idx, shift_instance_id -> s_idx
    employee_id_to_idx: dict[int, int] = field(default_factory=dict)
    shift_id_to_idx: dict[int, int] = field(default_factory=dict)
    # (employee_id, date) pairs where employee is absent and must not be assigned
    absent_dates: set[tuple[int, date]] = field(default_factory=set)
    # Per-run employee preferences (None = include all planable employees with defaults)
    employee_preferences: dict[int, EmployeePlanningPreference] | None = None


def load_planning_context(
    start_date: date,
    end_date: date,
    existing_assignments_handling: str,
    absent_dates: set[tuple[int, date]] | None = None,
    external_fixed_assignments: list[dict[str, Any]] | None = None,
    employee_preferences: dict[int, EmployeePlanningPreference] | None = None,
) -> PlanningContext:
    """
    Load planning context for the given date range.
    Derives planning month from start_date/end_date; includes previous month for W2/W3.
    """
    # Planning month: use start_date month
    planning_month = start_date.strftime("%Y-%m")
    year, month_num = start_date.year, start_date.month
    _, last_day = monthrange(year, month_num)
    ctx_start = date(year, month_num, 1)
    ctx_end = date(year, month_num, last_day)

    # Previous month for weekend rotation / day-night evaluation
    if month_num == 1:
        prev_year, prev_month = year - 1, 12
    else:
        prev_year, prev_month = year, month_num - 1
    _, prev_last = monthrange(prev_year, prev_month)
    prev_month_start = date(prev_year, prev_month, 1)
    prev_month_end = date(prev_year, prev_month, prev_last)

    # Load shift instances: planning month + previous month (with definitions).
    # Wenn der Planungsmonat an einem Samstag endet: Sonntag mit laden, damit H6/H7
    # (gleicher MA für Sa+So / gleiche Tagesart) für das Wochenende greifen.
    load_start = prev_month_start
    load_end = ctx_end
    if ctx_end.weekday() == 5:  # Saturday
        load_end = ctx_end + timedelta(days=1)  # include Sunday
    shift_instances = (
        db.session.query(ShiftInstance)
        .join(ShiftDefinition)
        .filter(ShiftInstance.date >= load_start, ShiftInstance.date <= load_end)
        .order_by(ShiftInstance.date, ShiftInstance.id)
        .all()
    )
    # Eager load shift_definition to avoid lazy load
    shift_infos: list[ShiftInfo] = []
    for i, si in enumerate(shift_instances):
        sd = si.shift_definition
        shift_infos.append(
            ShiftInfo(
                index=i,
                id=si.id,
                date=si.date,
                calendar_week=si.calendar_week,
                month=si.month,
                category=sd.category,
                role=sd.role,
                area=_normalize_area(sd.area) or sd.area,
                time_of_day=sd.time_of_day,
                is_weekday=sd.is_weekday,
                is_weekend=sd.is_weekend,
            )
        )

    # Employees with planable role
    all_employees = Employee.query.all()
    planable: list[PlanableEmployee] = []
    employee_id_to_idx: dict[int, int] = {}
    for emp in all_employees:
        role = employee_role(emp)
        if role in (ROLE_NURSING, ROLE_DOCTOR):
            idx = len(planable)
            area = _normalize_area(getattr(emp, "area", None))
            planable.append(
                PlanableEmployee(
                    index=idx,
                    id=emp.id,
                    role=role,
                    area=area,
                    latitude=getattr(emp, "latitude", None),
                    longitude=getattr(emp, "longitude", None),
                )
            )
            employee_id_to_idx[emp.id] = idx

    # Capacity: for planning month only, all 5 types per employee
    capacity_types = [
        "RB_NURSING_WEEKDAY",
        "RB_NURSING_WEEKEND",
        "RB_DOCTORS_WEEKDAY",
        "RB_DOCTORS_WEEKEND",
        "AW_NURSING",
    ]
    capacity_max: dict[int, dict[str, int]] = {}
    capacities = EmployeeCapacity.query.filter(
        EmployeeCapacity.employee_id.in_(employee_id_to_idx),
        EmployeeCapacity.capacity_type.in_(capacity_types),
    ).all()
    for cap in capacities:
        if cap.employee_id not in capacity_max:
            capacity_max[cap.employee_id] = {ct: 0 for ct in capacity_types}
        capacity_max[cap.employee_id][cap.capacity_type] = cap.max_count
    for eid in employee_id_to_idx:
        if eid not in capacity_max:
            capacity_max[eid] = {ct: 0 for ct in capacity_types}

    # Mitarbeiter ohne jegliche Kapazität aus Planung ausschließen (gilt mit und ohne Überplanung)
    employees_with_capacity = [
        eid for eid in employee_id_to_idx if sum(capacity_max.get(eid, {}).values()) > 0
    ]
    # planable, employee_id_to_idx, capacity_max neu aufbauen
    planable = []
    employee_id_to_idx = {}
    for emp in all_employees:
        if emp.id not in employees_with_capacity:
            continue
        role = employee_role(emp)
        if role in (ROLE_NURSING, ROLE_DOCTOR):
            idx = len(planable)
            area = _normalize_area(getattr(emp, "area", None))
            planable.append(
                PlanableEmployee(
                    index=idx,
                    id=emp.id,
                    role=role,
                    area=area,
                    latitude=getattr(emp, "latitude", None),
                    longitude=getattr(emp, "longitude", None),
                )
            )
            employee_id_to_idx[emp.id] = idx
    capacity_max = {eid: capacity_max[eid] for eid in employees_with_capacity}

    # Per-run inclusion filter: only employees explicitly marked included
    if employee_preferences is not None:
        included_ids = {
            eid for eid, pref in employee_preferences.items() if pref.included
        }
        filtered = [e for e in planable if e.id in included_ids]
        planable = []
        employee_id_to_idx = {}
        for idx, e in enumerate(filtered):
            planable.append(
                PlanableEmployee(
                    index=idx,
                    id=e.id,
                    role=e.role,
                    area=e.area,
                    latitude=e.latitude,
                    longitude=e.longitude,
                )
            )
            employee_id_to_idx[e.id] = idx
        capacity_max = {eid: capacity_max[eid] for eid in included_ids if eid in capacity_max}

    # Shift id -> index
    shift_id_to_idx = {s.id: s.index for s in shift_infos}

    # Feste Assignments (nur Solver-Input; nichts wird in der DB überschrieben):
    # - Planungsmonat bei RESPECT: aus DB
    # - Folgetag (z. B. So nach Monatsende): aus DB
    # - Vormonat:
    #   - OHNE Aplano-Historie: aus DB
    #   - MIT Aplano-Historie: DB-Fixes im Vormonat ignorieren; Aplano wirkt nur als
    #     SOFT-Präferenz (preferred_assignments), nicht als harte x==1-Fixierung.
    # RESPECT/OVERWRITE gilt nur für den ausgewählten Planungsmonat.
    fixed_assignments: set[tuple[int, int]] = set()
    existing = (
        db.session.query(Assignment)
        .join(ShiftInstance)
        .filter(
            Assignment.source.in_(["SOLVER", "MANUAL"]),
            ShiftInstance.date >= load_start,
            ShiftInstance.date <= load_end,
        )
        .all()
    )
    for a in existing:
        e_idx = employee_id_to_idx.get(a.employee_id)
        s_idx = shift_id_to_idx.get(a.shift_instance_id)
        if e_idx is None or s_idx is None:
            continue
        shift_date = a.shift_instance.date
        if shift_date < ctx_start:
            # Vormonat aus DB nur verwenden, wenn keine Aplano-Historie vorliegt.
            if not external_fixed_assignments:
                fixed_assignments.add((e_idx, s_idx))
        elif shift_date > ctx_end:
            # Folgetag(e) nach Monatsende weiterhin aus DB übernehmen.
            fixed_assignments.add((e_idx, s_idx))
        elif existing_assignments_handling.lower() == "respect":
            # Planungsmonat: nur bei RESPECT fixieren
            fixed_assignments.add((e_idx, s_idx))

    preferred_assignments: set[tuple[int, int]] = set()

    if external_fixed_assignments:
        # Lookup für Shift-Matching aus Aplano-Historie:
        # (date, category, role, time_of_day, area?) -> shift indices
        lookup_exact: dict[tuple[date, str, str, str, str | None], list[int]] = {}
        lookup_area_agnostic: dict[tuple[date, str, str, str], list[int]] = {}
        for s in shift_infos:
            exact_key = (
                s.date,
                (s.category or "").upper(),
                (s.role or "").upper(),
                (s.time_of_day or "").upper(),
                _normalize_area(s.area),
            )
            lookup_exact.setdefault(exact_key, []).append(s.index)
            no_area_key = (
                s.date,
                (s.category or "").upper(),
                (s.role or "").upper(),
                (s.time_of_day or "").upper(),
            )
            lookup_area_agnostic.setdefault(no_area_key, []).append(s.index)

        grouped: dict[tuple[int, date], list[dict[str, Any]]] = defaultdict(list)
        for item in external_fixed_assignments:
            employee_id = item.get("employee_id")
            assign_date = item.get("date")
            if employee_id is None or assign_date is None or assign_date >= ctx_start:
                continue
            grouped[(employee_id, assign_date)].append(item)

        for (employee_id, assign_date), items in grouped.items():
            e_idx = employee_id_to_idx.get(employee_id)
            if e_idx is None:
                continue

            chosen_s_idx: int | None = None
            for item in items:
                category = str(item.get("category", "")).upper()
                role = str(item.get("role", "")).upper()
                time_of_day = str(item.get("time_of_day", "")).upper()
                area = _normalize_area(item.get("area"))

                exact_key = (assign_date, category, role, time_of_day, area)
                candidates = lookup_exact.get(exact_key, [])

                if not candidates:
                    no_area_key = (assign_date, category, role, time_of_day)
                    candidates = lookup_area_agnostic.get(no_area_key, [])

                chosen_s_idx = _pick_single_external_shift(candidates, e_idx, shift_infos, planable)
                if chosen_s_idx is not None:
                    break

            if chosen_s_idx is None:
                continue

            # Aplano-Vormonat nur als Präferenz (soft), nicht als harte Fixierung.
            preferred_assignments.add((e_idx, chosen_s_idx))

    ctx = PlanningContext(
        planning_month=planning_month,
        start_date=ctx_start,
        end_date=ctx_end,
        prev_month_start=prev_month_start,
        prev_month_end=prev_month_end,
        employees=planable,
        shifts=shift_infos,
        capacity_max=capacity_max,
        fixed_assignments=fixed_assignments,
        preferred_assignments=preferred_assignments,
        employee_id_to_idx=employee_id_to_idx,
        shift_id_to_idx=shift_id_to_idx,
        absent_dates=absent_dates if absent_dates is not None else set(),
        employee_preferences=employee_preferences,
    )
    return ctx
