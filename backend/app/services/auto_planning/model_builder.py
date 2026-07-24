"""
Build OR-Tools CP-SAT model: variables x(e,s), hard constraints H1–H7, soft constraints W1–W4, objective.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, timedelta

from ortools.sat.python import cp_model

from app.services.route_utils import distance_km_to_area_start

from .capacity import (
    capacity_remaining,
    capacity_type_for_shift,
    shift_matches_capacity,
)
from .data_loader import EmployeePlanningPreference, PlanningContext, ShiftInfo


@dataclass
class PlanningModel:
    """CP-SAT model plus index structures for solution extraction."""

    model: cp_model.CpModel
    # (e_idx, s_idx) -> IntVar (binary)
    x: dict[tuple[int, int], cp_model.IntVar] = field(default_factory=dict)
    # list of (e_idx, s_idx) that have a variable (for iteration)
    pairs: list[tuple[int, int]] = field(default_factory=list)
    context: PlanningContext = field(default=None)


def _is_even_calendar_week(calendar_week: int) -> bool:
    return calendar_week % 2 == 0


def _rb_week_allowed(pref: EmployeePlanningPreference | None, calendar_week: int) -> bool:
    """Hard filter: RB shifts only in allowed even/odd ISO weeks."""
    if pref is None:
        return True
    is_even = _is_even_calendar_week(calendar_week)
    if is_even and not pref.rb_even_weeks:
        return False
    if not is_even and not pref.rb_odd_weeks:
        return False
    return True


def _w2_rhythm_multiplier(pref: EmployeePlanningPreference | None, role: str) -> float:
    """Scale W2 weekend rotation penalty per employee AW rhythm preference."""
    if role != "NURSING" or pref is None:
        return 1.0
    if pref.aw_rhythm == "regular":
        return 2.0
    if pref.aw_rhythm == "irregular":
        return 0.25
    return 1.0


def _shift_matches_capacity(s: ShiftInfo, cap_type: str) -> bool:
    return shift_matches_capacity(s, cap_type)


def _get_shifts_for_capacity(
    shifts: list[ShiftInfo], planning_month: str, cap_type: str
) -> list[int]:
    """Return list of shift indices that count toward this capacity in planning month."""
    return [
        s.index
        for s in shifts
        if s.month == planning_month and _shift_matches_capacity(s, cap_type)
    ]


def _get_capacity_type_for_shift(s: ShiftInfo) -> str | None:
    """Return the capacity type this shift counts toward, or None if none."""
    return capacity_type_for_shift(s)


def _capacity_limit(ctx: PlanningContext, employee_id: int, cap_type: str) -> int:
    """Configured max minus out-of-scope duties already consuming capacity."""
    max_count = ctx.capacity_max.get(employee_id, {}).get(cap_type, 0)
    used = getattr(ctx, "capacity_already_used", {}).get(employee_id, {}).get(cap_type, 0)
    return capacity_remaining(max_count, used)

def _is_decision_shift(s: ShiftInfo, planning_start: date) -> bool:
    """True for planning-month (+ trailing Sunday) shifts the solver may freely fill."""
    return s.date >= planning_start


def _aw_weekend_pairs(shifts: list[ShiftInfo]) -> list[tuple[int, int]]:
    """Pairs (s_sat_idx, s_sun_idx) for AW NURSING same area, same calendar week."""
    by_week_area: dict[tuple[int, str], list[ShiftInfo]] = defaultdict(list)
    for s in shifts:
        if s.category != "AW" or s.role != "NURSING":
            continue
        if s.date.weekday() == 5:  # Saturday
            by_week_area[(s.calendar_week, s.area)].append(s)
        elif s.date.weekday() == 6:  # Sunday
            by_week_area[(s.calendar_week, s.area)].append(s)
    pairs: list[tuple[int, int]] = []
    for (_cw, _area), lst in by_week_area.items():
        sat_list = [s for s in lst if s.date.weekday() == 5]
        sun_list = [s for s in lst if s.date.weekday() == 6]
        for s_sat in sat_list:
            for s_sun in sun_list:
                pairs.append((s_sat.index, s_sun.index))
    return pairs


def _rb_weekend_sat_sun_pairs(shifts: list[ShiftInfo]) -> list[tuple[int, int]]:
    """
    Pairs (s_sat_idx, s_sun_idx) for RB_WEEKEND same area, same time_of_day, same calendar week.
    Same rule as AW: if you have Saturday RB you also have Sunday RB (same employee).
    """
    by_week_area_tod: dict[tuple[int, str, str], list[ShiftInfo]] = defaultdict(list)
    for s in shifts:
        if s.category != "RB_WEEKEND" or s.role != "NURSING":
            continue
        if s.date.weekday() == 5:
            by_week_area_tod[(s.calendar_week, s.area, s.time_of_day)].append(s)
        elif s.date.weekday() == 6:
            by_week_area_tod[(s.calendar_week, s.area, s.time_of_day)].append(s)
    pairs: list[tuple[int, int]] = []
    for (_cw, _area, _tod), lst in by_week_area_tod.items():
        sat_list = [s for s in lst if s.date.weekday() == 5]
        sun_list = [s for s in lst if s.date.weekday() == 6]
        for s_sat in sat_list:
            for s_sun in sun_list:
                pairs.append((s_sat.index, s_sun.index))
    return pairs


def _rb_nursing_weekend_day_night_pairs(shifts: list[ShiftInfo]) -> list[tuple[int, int]]:
    """
    Pairs (s_day_idx, s_night_idx) that must not both be assigned to same employee in same weekend.
    For H7: no DAY on one day and NIGHT on the other. So we forbid (sat_day, sun_night) and (sat_night, sun_day).
    Returns list of (s_a_idx, s_b_idx) such that for each e: x[e,s_a] + x[e,s_b] <= 1.
    """
    by_week: dict[int, list[ShiftInfo]] = defaultdict(list)
    for s in shifts:
        if s.category != "RB_WEEKEND" or s.role != "NURSING":
            continue
        by_week[s.calendar_week].append(s)
    pairs: list[tuple[int, int]] = []
    for _cw, lst in by_week.items():
        sat_day = [s for s in lst if s.date.weekday() == 5 and s.time_of_day == "DAY"]
        sat_night = [s for s in lst if s.date.weekday() == 5 and s.time_of_day == "NIGHT"]
        sun_day = [s for s in lst if s.date.weekday() == 6 and s.time_of_day == "DAY"]
        sun_night = [s for s in lst if s.date.weekday() == 6 and s.time_of_day == "NIGHT"]
        for s_sat_d in sat_day:
            for s_sun_n in sun_night:
                pairs.append((s_sat_d.index, s_sun_n.index))
        for s_sat_n in sat_night:
            for s_sun_d in sun_day:
                pairs.append((s_sat_n.index, s_sun_d.index))
    return pairs


def _saturday_of_weekend_shift(d: date) -> date:
    """ISO weekend bucket: Saturday of the Sat/Sun pair containing d."""
    if d.weekday() == 5:
        return d
    if d.weekday() == 6:
        return d - timedelta(days=1)
    return d + timedelta(days=(5 - d.weekday()) % 7)


def _consecutive_weekend_duty_pairs(
    shifts: list[ShiftInfo],
) -> list[tuple[list[int], list[int]]]:
    """
      Pairs of shift-index lists for chronologically adjacent weekends (7 days apart).
      Each list contains AW + RB_WEEKEND slots on that Sat/Sun.
    Used for W2: penalize any weekend duty two weeks in a row (AW/RB → frei → …).
    """
    by_sat: dict[date, list[int]] = defaultdict(list)
    for s in shifts:
        if not s.is_weekend or s.category not in ("AW", "RB_WEEKEND"):
            continue
        by_sat[_saturday_of_weekend_shift(s.date)].append(s.index)
    saturdays = sorted(by_sat.keys())
    pairs: list[tuple[list[int], list[int]]] = []
    for i in range(1, len(saturdays)):
        sat_prev, sat_curr = saturdays[i - 1], saturdays[i]
        if (sat_curr - sat_prev).days != 7:
            continue
        pairs.append((by_sat[sat_prev], by_sat[sat_curr]))
    return pairs


def _weekend_then_monday_rb_pairs(shifts: list[ShiftInfo]) -> list[tuple[list[int], list[int]]]:
    """
    For each weekend (Sat+Sun): (weekend_shift_indices, monday_rb_shift_indices).
    Weekend shifts = AW or RB_WEEKEND on that Sat/Sun. Monday RB = RB_WEEKDAY on the Monday after.
    Used to penalize: employee had weekend duty -> avoid RB on the following Monday (prefer from Tuesday).
    """
    sundays = sorted({s.date for s in shifts if s.date.weekday() == 6})
    result: list[tuple[list[int], list[int]]] = []
    for sun_date in sundays:
        sat_date = sun_date - timedelta(days=1)
        mon_date = sun_date + timedelta(days=1)
        weekend_indices = [
            s.index
            for s in shifts
            if s.category in ("AW", "RB_WEEKEND") and (s.date == sat_date or s.date == sun_date)
        ]
        monday_rb_indices = [
            s.index for s in shifts if s.category == "RB_WEEKDAY" and s.date == mon_date
        ]
        if weekend_indices and monday_rb_indices:
            result.append((weekend_indices, monday_rb_indices))
    return result


def _friday_rb_weekend_rb_night_pairs(shifts: list[ShiftInfo]) -> list[tuple[list[int], list[int]]]:
    """
    For each weekend (Sat+Sun): (friday_rb_nursing_indices, weekend_rb_night_indices).
    Friday = the Friday before that Saturday. Used to reward: same employee has Friday RB and
    RB Nacht on that weekend (and vice versa).
    """
    saturdays = sorted({s.date for s in shifts if s.date.weekday() == 5})
    result: list[tuple[list[int], list[int]]] = []
    for sat_date in saturdays:
        friday_date = sat_date - timedelta(days=1)
        sun_date = sat_date + timedelta(days=1)
        friday_rb_indices = [
            s.index
            for s in shifts
            if s.category == "RB_WEEKDAY" and s.role == "NURSING" and s.date == friday_date
        ]
        weekend_night_indices = [
            s.index
            for s in shifts
            if s.category == "RB_WEEKEND"
            and s.role == "NURSING"
            and s.time_of_day == "NIGHT"
            and (s.date == sat_date or s.date == sun_date)
        ]
        if friday_rb_indices and weekend_night_indices:
            result.append((friday_rb_indices, weekend_night_indices))
    return result


def build_model(
    ctx: PlanningContext,
    allow_overplanning: bool,
    penalty_w1: int = 100,
    penalty_w2: int = 150,  # Wochenend-Rotation: gleicher Typ nicht zwei Wochenenden hintereinander
    penalty_w3: int = 60,
    penalty_fairness: int = 50,
    penalty_overplanning: int = 800,  # Stark: Kapazitäten auch bei Überplanung möglichst einhalten
    penalty_area_mismatch: int = 40,
    penalty_distance_per_km: int = 3,
    penalty_weekend_then_monday_rb: int = 70,
    bonus_friday_weekend_rb_coupling: int = 60,  # Belohnung wenn gleiche Person Fr RB + Wo RB Nacht
    bonus_duty_preference: int = 80,
    penalty_duty_preference: int = 120,
) -> PlanningModel:
    """
    Build CP-SAT model with variables and all constraints.
    Decision variables: planning-month shifts (from ctx.start_date) only.
    Previous-month shifts are context: variables only for fixed/preferred history
    (W2/W3), no free fill, no fill bonus.
    """
    model = cp_model.CpModel()
    employees = ctx.employees
    shifts = ctx.shifts
    planning_month = ctx.planning_month
    fixed = ctx.fixed_assignments
    preferred = set(getattr(ctx, "preferred_assignments", set()) or set())
    context_history_keys = fixed | preferred

    # --- Variables: x[(e_idx, s_idx)] only for compatible (role match); skip if employee absent/busy ---
    # 0 Kapazität in einer Kategorie = kein Zugriff auf Schichten dieser Kategorie (gilt auch bei Überplanung)
    # Vormonat: keine freien Variablen — nur bestehende Historie (fixed/preferred) für Soft-Constraints.
    absent_dates = getattr(ctx, "absent_dates", set()) or set()
    busy_dates = getattr(ctx, "busy_dates", set()) or set()
    unavailable_dates = absent_dates | busy_dates
    employee_prefs = getattr(ctx, "employee_preferences", None) or {}
    x: dict[tuple[int, int], cp_model.IntVar] = {}
    for e in employees:
        caps = ctx.capacity_max.get(e.id, {})
        pref = employee_prefs.get(e.id)
        for s in shifts:
            if e.role != s.role:
                continue
            key = (e.index, s.index)
            is_context = not _is_decision_shift(s, ctx.start_date)
            if is_context:
                if key not in context_history_keys:
                    continue
                if key in fixed:
                    # Feste Historie immer abbilden (W2/W3), unabhängig von Kapazitätsfiltern
                    x[key] = model.NewBoolVar(f"x_{e.index}_{s.index}")
                    continue
                # preferred: normale Filter, dann Soft-Bonus ohne Fill-Bonus
            if (e.id, s.date) in unavailable_dates:
                continue
            cap_type = _get_capacity_type_for_shift(s)
            # Configured max 0 = no entitlement (even with overplanning)
            if cap_type is not None and caps.get(cap_type, 0) == 0:
                continue
            if s.category in ("RB_WEEKDAY", "RB_WEEKEND") and not _rb_week_allowed(
                pref, s.calendar_week
            ):
                continue
            x[key] = model.NewBoolVar(f"x_{e.index}_{s.index}")
    pairs = list(x.keys())

    # --- H1: Pro Schicht max. 1 Mitarbeiter; bei Overplanning: jede Schicht im Planungsmonat genau 1 ---
    # Locked shifts (MANUAL von nicht-planbaren MA, oder Fix ohne Variable): keine weitere Solver-Zuweisung.
    locked_shifts = set(getattr(ctx, "locked_shift_indices", set()) or set())
    for e_idx, s_idx in fixed:
        if (e_idx, s_idx) not in x:
            # Fix kann nicht gesetzt werden (z. B. Kapazität 0) → Schicht sperren statt Doppelbesetzung
            locked_shifts.add(s_idx)

    for s_idx in locked_shifts:
        for ei, s in pairs:
            if s != s_idx:
                continue
            # Nie eine feste Zuweisung auf 0 zwingen (Lock ⊕ Fixed wäre sonst INFEASIBLE)
            if (ei, s_idx) in fixed:
                continue
            model.Add(x[(ei, s_idx)] == 0)

    fixed_shift_indices = {s_idx for (_, s_idx) in fixed}
    for s_idx in range(len(shifts)):
        # Rein gelockte Schichten (ohne Fix): alle freien Vars sind 0 — kein H1 nötig
        if s_idx in locked_shifts and s_idx not in fixed_shift_indices:
            continue
        vars_s = [x[(e, s_idx)] for (e, s) in pairs if s == s_idx]
        if not vars_s:
            continue
        if allow_overplanning and shifts[s_idx].month == planning_month:
            model.Add(sum(vars_s) == 1)  # Jede Schicht im Monat muss besetzt sein
        else:
            model.Add(sum(vars_s) <= 1)

    # --- H2: Each employee at most one shift per day ---
    for e_idx in range(len(employees)):
        for d in set(s.date for s in shifts):
            vars_ed = [
                x[(e_idx, s_idx)]
                for (e_idx_p, s_idx) in pairs
                if e_idx_p == e_idx and shifts[s_idx].date == d
            ]
            if vars_ed:
                model.Add(sum(vars_ed) <= 1)

    # --- H4: Capacity (planning month only); only for shifts in planning month ---
    if not allow_overplanning:
        for e in employees:
            eid = e.id
            caps = ctx.capacity_max.get(eid, {})
            for cap_type, max_count in caps.items():
                if max_count < 0:
                    continue
                limit = _capacity_limit(ctx, eid, cap_type)
                s_indices = _get_shifts_for_capacity(shifts, planning_month, cap_type)
                if not s_indices:
                    continue
                vars_cap = [
                    x[(e.index, s_idx)]
                    for (ei, s_idx) in pairs
                    if ei == e.index and s_idx in s_indices
                ]
                if vars_cap:
                    model.Add(sum(vars_cap) <= limit)

    # --- H5: Fix existing assignments (RESPECT) ---
    for e_idx, s_idx in fixed:
        key = (e_idx, s_idx)
        if key in x:
            model.Add(x[key] == 1)

    # --- H6: AW weekend coupling: same employee for Sat and Sun, same area ---
    aw_pairs = _aw_weekend_pairs(shifts)
    for s_sat_idx, s_sun_idx in aw_pairs:
        for e in employees:
            k_sat = (e.index, s_sat_idx)
            k_sun = (e.index, s_sun_idx)
            if k_sat in x and k_sun in x:
                model.Add(x[k_sat] == x[k_sun])

    # --- H6b: RB weekend coupling: same employee for Sat and Sun (same area, same time_of_day) ---
    rb_sat_sun_pairs = _rb_weekend_sat_sun_pairs(shifts)
    for s_sat_idx, s_sun_idx in rb_sat_sun_pairs:
        for e in employees:
            k_sat = (e.index, s_sat_idx)
            k_sun = (e.index, s_sun_idx)
            if k_sat in x and k_sun in x:
                model.Add(x[k_sat] == x[k_sun])

    # --- H7: RB nursing weekend: no DAY on one day and NIGHT on the other (same weekend) ---
    forbid_pairs = _rb_nursing_weekend_day_night_pairs(shifts)
    for s_a, s_b in forbid_pairs:
        for e in employees:
            ka = (e.index, s_a)
            kb = (e.index, s_b)
            if ka in x and kb in x:
                model.Add(x[ka] + x[kb] <= 1)

    # --- Objective: weighted sum of soft violations ---
    objective_terms: list = []

    # Anreiz, Schichten zu besetzen — nur Entscheidungs-Schichten (Planungsmonat), nicht Vormonat-Kontext
    fill_bonus = 1000
    for e_idx, s_idx in pairs:
        if _is_decision_shift(shifts[s_idx], ctx.start_date):
            objective_terms.append(-fill_bonus * x[(e_idx, s_idx)])

    # Aplano-Vormonat als weiche Historie:
    # Bevorzuge (MA, Schicht)-Paare aus external history, erzwinge sie aber nicht hart.
    preferred_bonus = 350
    for key in preferred:
        if key in x:
            objective_terms.append(-preferred_bonus * x[key])

    # W1: RB weekday per week: prefer at most 1; 2 allowed with penalty
    # Auxiliary: aux[e,w] = 1 if employee e has >= 2 RB_WEEKDAY in week w
    rb_weekday_shifts_by_week: dict[int, list[int]] = defaultdict(list)
    for s in shifts:
        if s.category == "RB_WEEKDAY":
            rb_weekday_shifts_by_week[s.calendar_week].append(s.index)
    for e in employees:
        for cw, s_indices in rb_weekday_shifts_by_week.items():
            if len(s_indices) < 2:
                continue
            vars_ew = [
                x[(e.index, s_idx)] for (ei, s_idx) in pairs if ei == e.index and s_idx in s_indices
            ]
            if len(vars_ew) < 2:
                continue
            # aux = 1 if sum >= 2
            aux = model.NewBoolVar(f"w1_aux_{e.index}_{cw}")
            model.Add(sum(vars_ew) >= 2).OnlyEnforceIf(aux)
            model.Add(sum(vars_ew) <= 1).OnlyEnforceIf(aux.Not())
            objective_terms.append(aux * penalty_w1)

    # W2: Weekend rotation (AW -> frei -> RB -> frei): penalize ANY AW/RB duty on two weekends in a row
    # (chronological Saturdays, not calendar_week numbers — avoids ISO-year edge cases).
    # Additional penalty when the same type repeats (AW->AW or RB->RB).
    weekend_weeks = sorted(set(s.calendar_week for s in shifts if s.is_weekend))
    consecutive_weekend_pairs = _consecutive_weekend_duty_pairs(shifts)
    for e in employees:
        pref = employee_prefs.get(e.id)
        w2_mult = _w2_rhythm_multiplier(pref, e.role)
        w2_penalty = int(round(penalty_w2 * w2_mult))
        for shifts_prev, shifts_curr in consecutive_weekend_pairs:
            sat_curr = _saturday_of_weekend_shift(shifts[shifts_curr[0]].date)
            # Vormonat-only-Paare überspringen (werden nicht gespeichert); Grenze Apr→Mai bleibt aktiv.
            if sat_curr < ctx.start_date:
                continue
            vars_prev = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in shifts_prev]
            vars_curr = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in shifts_curr]
            if not vars_prev or not vars_curr:
                continue
            has_duty_prev = model.NewBoolVar(f"w2_duty_prev_{e.index}_{sat_curr}")
            model.Add(sum(vars_prev) >= 1).OnlyEnforceIf(has_duty_prev)
            model.Add(sum(vars_prev) == 0).OnlyEnforceIf(has_duty_prev.Not())
            has_duty_curr = model.NewBoolVar(f"w2_duty_curr_{e.index}_{sat_curr}")
            model.Add(sum(vars_curr) >= 1).OnlyEnforceIf(has_duty_curr)
            model.Add(sum(vars_curr) == 0).OnlyEnforceIf(has_duty_curr.Not())
            repeat_weekend = model.NewBoolVar(f"w2_repeat_weekend_{e.index}_{sat_curr}")
            model.Add(repeat_weekend <= has_duty_prev)
            model.Add(repeat_weekend <= has_duty_curr)
            model.Add(repeat_weekend >= has_duty_prev + has_duty_curr - 1)
            objective_terms.append(repeat_weekend * w2_penalty)
            aw_prev = [s for s in shifts_prev if shifts[s].category == "AW"]
            aw_curr = [s for s in shifts_curr if shifts[s].category == "AW"]
            rb_prev = [s for s in shifts_prev if shifts[s].category == "RB_WEEKEND"]
            rb_curr = [s for s in shifts_curr if shifts[s].category == "RB_WEEKEND"]
            if aw_prev and aw_curr:
                vars_aw_prev = [
                    x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in aw_prev
                ]
                vars_aw_curr = [
                    x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in aw_curr
                ]
                if vars_aw_prev and vars_aw_curr:
                    has_aw_prev = model.NewBoolVar(f"w2_aw_prev_{e.index}_{sat_curr}")
                    model.Add(sum(vars_aw_prev) >= 1).OnlyEnforceIf(has_aw_prev)
                    model.Add(sum(vars_aw_prev) == 0).OnlyEnforceIf(has_aw_prev.Not())
                    has_aw_curr = model.NewBoolVar(f"w2_aw_curr_{e.index}_{sat_curr}")
                    model.Add(sum(vars_aw_curr) >= 1).OnlyEnforceIf(has_aw_curr)
                    model.Add(sum(vars_aw_curr) == 0).OnlyEnforceIf(has_aw_curr.Not())
                    repeat_aw = model.NewBoolVar(f"w2_repeat_aw_{e.index}_{sat_curr}")
                    model.Add(repeat_aw <= has_aw_prev)
                    model.Add(repeat_aw <= has_aw_curr)
                    model.Add(repeat_aw >= has_aw_prev + has_aw_curr - 1)
                    objective_terms.append(repeat_aw * w2_penalty)
            if rb_prev and rb_curr:
                vars_rb_prev = [
                    x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in rb_prev
                ]
                vars_rb_curr = [
                    x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in rb_curr
                ]
                if vars_rb_prev and vars_rb_curr:
                    has_rb_prev = model.NewBoolVar(f"w2_rb_prev_{e.index}_{sat_curr}")
                    model.Add(sum(vars_rb_prev) >= 1).OnlyEnforceIf(has_rb_prev)
                    model.Add(sum(vars_rb_prev) == 0).OnlyEnforceIf(has_rb_prev.Not())
                    has_rb_curr = model.NewBoolVar(f"w2_rb_curr_{e.index}_{sat_curr}")
                    model.Add(sum(vars_rb_curr) >= 1).OnlyEnforceIf(has_rb_curr)
                    model.Add(sum(vars_rb_curr) == 0).OnlyEnforceIf(has_rb_curr.Not())
                    repeat_rb = model.NewBoolVar(f"w2_repeat_rb_{e.index}_{sat_curr}")
                    model.Add(repeat_rb <= has_rb_prev)
                    model.Add(repeat_rb <= has_rb_curr)
                    model.Add(repeat_rb >= has_rb_prev + has_rb_curr - 1)
                    objective_terms.append(repeat_rb * w2_penalty)

    # W3: RB nursing weekend Tag/Nacht alternation: penalize same time_of_day two weekends in a row
    rb_nursing_weekends: list[tuple[int, list[int], list[int]]] = []
    for cw in weekend_weeks:
        day_idxs = [
            s.index
            for s in shifts
            if s.calendar_week == cw
            and s.category == "RB_WEEKEND"
            and s.role == "NURSING"
            and s.time_of_day == "DAY"
        ]
        night_idxs = [
            s.index
            for s in shifts
            if s.calendar_week == cw
            and s.category == "RB_WEEKEND"
            and s.role == "NURSING"
            and s.time_of_day == "NIGHT"
        ]
        if day_idxs or night_idxs:
            rb_nursing_weekends.append((cw, day_idxs, night_idxs))
    for e in employees:
        for i in range(1, len(rb_nursing_weekends)):
            cw_prev, day_prev, night_prev = rb_nursing_weekends[i - 1]
            cw_curr, day_curr, night_curr = rb_nursing_weekends[i]
            had_day_prev = model.NewBoolVar(f"w3_day_prev_{e.index}_{cw_prev}")
            had_night_prev = model.NewBoolVar(f"w3_night_prev_{e.index}_{cw_prev}")
            if day_prev:
                vd = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in day_prev]
                if vd:
                    model.Add(sum(vd) >= 1).OnlyEnforceIf(had_day_prev)
                    model.Add(sum(vd) == 0).OnlyEnforceIf(had_day_prev.Not())
            else:
                model.Add(had_day_prev == 0)
            if night_prev:
                vn = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in night_prev]
                if vn:
                    model.Add(sum(vn) >= 1).OnlyEnforceIf(had_night_prev)
                    model.Add(sum(vn) == 0).OnlyEnforceIf(had_night_prev.Not())
            else:
                model.Add(had_night_prev == 0)
            has_day_curr = model.NewBoolVar(f"w3_day_curr_{e.index}_{cw_curr}")
            has_night_curr = model.NewBoolVar(f"w3_night_curr_{e.index}_{cw_curr}")
            if day_curr:
                vd = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in day_curr]
                if vd:
                    model.Add(sum(vd) >= 1).OnlyEnforceIf(has_day_curr)
                    model.Add(sum(vd) == 0).OnlyEnforceIf(has_day_curr.Not())
            else:
                model.Add(has_day_curr == 0)
            if night_curr:
                vn = [x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in night_curr]
                if vn:
                    model.Add(sum(vn) >= 1).OnlyEnforceIf(has_night_curr)
                    model.Add(sum(vn) == 0).OnlyEnforceIf(has_night_curr.Not())
            else:
                model.Add(has_night_curr == 0)
            same_day = model.NewBoolVar(f"w3_same_day_{e.index}_{cw_curr}")
            model.Add(same_day <= had_day_prev)
            model.Add(same_day <= has_day_curr)
            model.Add(same_day >= had_day_prev + has_day_curr - 1)
            objective_terms.append(same_day * penalty_w3)
            same_night = model.NewBoolVar(f"w3_same_night_{e.index}_{cw_curr}")
            model.Add(same_night <= had_night_prev)
            model.Add(same_night <= has_night_curr)
            model.Add(same_night >= had_night_prev + has_night_curr - 1)
            objective_terms.append(same_night * penalty_w3)

    # W4: Fairness — penalize excess over target share of weekend shifts
    planning_shifts = [s for s in shifts if s.month == planning_month and s.is_weekend]
    if planning_shifts and employees:
        total_slots = len(planning_shifts)
        target_approx = total_slots // len(employees) if len(employees) else 0
        for e in employees:
            vars_e = [
                x[(e.index, s_idx)]
                for (ei, s_idx) in pairs
                if ei == e.index
                and shifts[s_idx].month == planning_month
                and shifts[s_idx].is_weekend
            ]
            if not vars_e:
                continue
            count_e = sum(vars_e)
            excess = model.NewIntVar(0, max(0, len(vars_e) - target_approx), f"w4_excess_{e.index}")
            model.Add(excess >= count_e - target_approx)
            objective_terms.append(excess * penalty_fairness)

    # W5: If employee had RB or AW weekend, prefer RB unter Woche from Tuesday — penalize RB on Monday after
    weekend_monday_pairs = _weekend_then_monday_rb_pairs(shifts)
    for weekend_indices, monday_rb_indices in weekend_monday_pairs:
        for e in employees:
            vars_weekend = [
                x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in weekend_indices
            ]
            vars_monday_rb = [
                x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in monday_rb_indices
            ]
            if not vars_weekend or not vars_monday_rb:
                continue
            has_weekend = model.NewBoolVar(f"w5_weekend_{e.index}_{weekend_indices[0]}")
            model.Add(sum(vars_weekend) >= 1).OnlyEnforceIf(has_weekend)
            model.Add(sum(vars_weekend) == 0).OnlyEnforceIf(has_weekend.Not())
            has_monday_rb = model.NewBoolVar(f"w5_mon_rb_{e.index}_{monday_rb_indices[0]}")
            model.Add(sum(vars_monday_rb) >= 1).OnlyEnforceIf(has_monday_rb)
            model.Add(sum(vars_monday_rb) == 0).OnlyEnforceIf(has_monday_rb.Not())
            both = model.NewBoolVar(f"w5_both_{e.index}_{weekend_indices[0]}")
            model.Add(both <= has_weekend)
            model.Add(both <= has_monday_rb)
            model.Add(both >= has_weekend + has_monday_rb - 1)
            objective_terms.append(both * penalty_weekend_then_monday_rb)

    # W6: Freitag RB <-> Wochenende RB Nacht koppeln: gleiche Person bevorzugen (Belohnung)
    friday_weekend_pairs = _friday_rb_weekend_rb_night_pairs(shifts)
    nursing_employees = [e for e in employees if e.role == "NURSING"]
    for friday_rb_indices, weekend_night_indices in friday_weekend_pairs:
        for e in nursing_employees:
            vars_friday = [
                x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in friday_rb_indices
            ]
            vars_weekend_night = [
                x[(e.index, s)] for (ei, s) in pairs if ei == e.index and s in weekend_night_indices
            ]
            if not vars_friday or not vars_weekend_night:
                continue
            has_friday_rb = model.NewBoolVar(f"w6_fr_rb_{e.index}_{friday_rb_indices[0]}")
            model.Add(sum(vars_friday) >= 1).OnlyEnforceIf(has_friday_rb)
            model.Add(sum(vars_friday) == 0).OnlyEnforceIf(has_friday_rb.Not())
            has_weekend_night = model.NewBoolVar(
                f"w6_wo_night_{e.index}_{weekend_night_indices[0]}"
            )
            model.Add(sum(vars_weekend_night) >= 1).OnlyEnforceIf(has_weekend_night)
            model.Add(sum(vars_weekend_night) == 0).OnlyEnforceIf(has_weekend_night.Not())
            both = model.NewBoolVar(f"w6_couple_{e.index}_{friday_rb_indices[0]}")
            model.Add(both <= has_friday_rb)
            model.Add(both <= has_weekend_night)
            model.Add(both >= has_friday_rb + has_weekend_night - 1)
            objective_terms.append(-bonus_friday_weekend_rb_coupling * both)

    # Duty preference (soft): per-employee AW/RB preference for nursing staff
    for e in employees:
        if e.role != "NURSING":
            continue
        pref = employee_prefs.get(e.id)
        if pref is None or pref.duty_preference == "neutral":
            continue
        aw_vars = [
            x[(e.index, s_idx)]
            for (ei, s_idx) in pairs
            if ei == e.index and shifts[s_idx].category == "AW"
        ]
        rb_vars = [
            x[(e.index, s_idx)]
            for (ei, s_idx) in pairs
            if ei == e.index and shifts[s_idx].category in ("RB_WEEKDAY", "RB_WEEKEND")
        ]
        if pref.duty_preference == "aw":
            for var in aw_vars:
                objective_terms.append(-bonus_duty_preference * var)
            for var in rb_vars:
                objective_terms.append(penalty_duty_preference * var)
        elif pref.duty_preference == "rb":
            for var in rb_vars:
                objective_terms.append(-bonus_duty_preference * var)
            for var in aw_vars:
                objective_terms.append(penalty_duty_preference * var)

    # Area mismatch (soft): prefer matching employee area to shift area (Nord/Süd only).
    # For shifts with area "Mitte" (e.g. AW Mitte) no preference — any employee (Nord/Süd) is fine.
    for e_idx, s_idx in pairs:
        emp_area = employees[e_idx].area
        shift_area = shifts[s_idx].area
        if emp_area is not None and shift_area and shift_area != "Mitte" and emp_area != shift_area:
            objective_terms.append(penalty_area_mismatch * x[(e_idx, s_idx)])

    # Distance to tour start (soft): for shifts with area (AW/Tour Nord/Mitte/Süd), prefer assigning
    # the employee whose home is closest to that area's start point.
    for e_idx, s_idx in pairs:
        shift_area = shifts[s_idx].area
        if not shift_area:
            continue
        emp = employees[e_idx]
        dist_km = distance_km_to_area_start(emp.latitude, emp.longitude, shift_area)
        if dist_km is not None and penalty_distance_per_km > 0:
            coeff = int(round(penalty_distance_per_km * dist_km))
            if coeff > 0:
                objective_terms.append(coeff * x[(e_idx, s_idx)])

    # Overplanning: Kapazitäten als weiche Constraints — Überschreitung bestrafen, Solver hält sie möglichst ein
    if allow_overplanning:
        for e in employees:
            eid = e.id
            caps = ctx.capacity_max.get(eid, {})
            for cap_type, max_count in caps.items():
                if max_count < 0:
                    continue
                limit = _capacity_limit(ctx, eid, cap_type)
                s_indices = _get_shifts_for_capacity(shifts, planning_month, cap_type)
                if not s_indices or max_count == 0:
                    continue
                vars_cap = [
                    x[(e.index, s_idx)]
                    for (ei, s_idx) in pairs
                    if ei == e.index and s_idx in s_indices
                ]
                if not vars_cap:
                    continue
                over = model.NewIntVar(0, len(vars_cap), f"over_{e.index}_{cap_type}")
                model.Add(over >= sum(vars_cap) - limit)
                objective_terms.append(over * penalty_overplanning)

    if objective_terms:
        model.Minimize(sum(objective_terms))
    else:
        model.Minimize(0)

    return PlanningModel(model=model, x=x, pairs=pairs, context=ctx)
