"""
Heuristic explanations when CP-SAT returns INFEASIBLE (OR-Tools does not expose a core reason).
"""

from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Set, Tuple

from .data_loader import PlanningContext
from .model_builder import PlanningModel, _get_capacity_type_for_shift


def collect_infeasibility_hints(
    ctx: PlanningContext,
    planning_model: PlanningModel,
    *,
    allow_overplanning: bool,
) -> Dict[str, Any]:
    """
    Collect structured hints from the built model and context (no second solve).
    """
    x_keys: Set[Tuple[int, int]] = set(planning_model.x.keys())
    employees = ctx.employees
    shifts = ctx.shifts
    absent = getattr(ctx, 'absent_dates', set()) or set()
    emp_by_idx = {e.index: e for e in employees}

    fixed_enforced = [(e_idx, s_idx) for (e_idx, s_idx) in ctx.fixed_assignments if (e_idx, s_idx) in x_keys]
    fixed_dropped: List[Dict[str, Any]] = []
    for (e_idx, s_idx) in ctx.fixed_assignments:
        if (e_idx, s_idx) in x_keys:
            continue
        e = emp_by_idx.get(e_idx)
        s = shifts[s_idx] if 0 <= s_idx < len(shifts) else None
        reasons: List[str] = []
        if e is None:
            reasons.append('unknown_employee_index')
        elif s is None:
            reasons.append('unknown_shift_index')
        else:
            if e.role != s.role:
                reasons.append('role_mismatch')
            if (e.id, s.date) in absent:
                reasons.append('absent_on_shift_date')
            caps = ctx.capacity_max.get(e.id, {})
            ct = _get_capacity_type_for_shift(s)
            if ct is not None and caps.get(ct, 0) == 0:
                reasons.append('zero_capacity_for_shift_category')
        fixed_dropped.append(
            {
                'employee_id': e.id if e else None,
                'employee_index': e_idx,
                'shift_instance_id': s.id if s else None,
                'shift_date': s.date.isoformat() if s else None,
                'reasons': reasons,
            }
        )

    by_shift_fixed: Dict[int, List[int]] = defaultdict(list)
    for (e_idx, s_idx) in fixed_enforced:
        by_shift_fixed[s_idx].append(e_idx)
    fixed_conflict_same_shift: List[Dict[str, Any]] = []
    for s_idx in sorted(by_shift_fixed.keys()):
        e_indices = sorted(by_shift_fixed[s_idx])
        if len(e_indices) < 2:
            continue
        sh = shifts[s_idx]
        employee_ids: List[int] = []
        employee_labels: List[str] = []
        for ei in e_indices:
            e = emp_by_idx.get(ei)
            if e:
                employee_ids.append(e.id)
                ar = e.area or '—'
                employee_labels.append(f'MA #{e.id} ({e.role}, {ar})')
            else:
                employee_labels.append(f'Unbekannter Index {ei}')
        fixed_conflict_same_shift.append(
            {
                'shift_instance_id': sh.id,
                'shift_date': sh.date.isoformat(),
                'category': sh.category,
                'role': sh.role,
                'area': sh.area,
                'time_of_day': sh.time_of_day,
                'employee_indices': e_indices,
                'employee_ids': employee_ids,
                'employee_labels': employee_labels,
            }
        )

    by_emp_day: Dict[Tuple[int, date], List[int]] = defaultdict(list)
    for (e_idx, s_idx) in fixed_enforced:
        d = shifts[s_idx].date
        by_emp_day[(e_idx, d)].append(s_idx)
    fixed_duplicate_same_day = []
    for (e_idx, d), s_list in by_emp_day.items():
        if len(s_list) < 2:
            continue
        e = emp_by_idx.get(e_idx)
        shifts_detail = []
        for si in sorted(s_list):
            sh = shifts[si]
            shifts_detail.append(
                {
                    'shift_instance_id': sh.id,
                    'category': sh.category,
                    'role': sh.role,
                    'area': sh.area,
                    'time_of_day': sh.time_of_day,
                }
            )
        fixed_duplicate_same_day.append(
            {
                'employee_id': e.id if e else None,
                'employee_index': e_idx,
                'date': d.isoformat(),
                'shift_instance_ids': [shifts[s].id for s in sorted(s_list)],
                'shifts': shifts_detail,
            }
        )

    pm_start, pm_end = ctx.start_date, ctx.end_date
    planning_month_shifts_zero_eligible: List[Dict[str, Any]] = []
    for s in shifts:
        if not (pm_start <= s.date <= pm_end):
            continue
        n_eligible = sum(1 for e in employees if (e.index, s.index) in x_keys)
        if n_eligible == 0:
            planning_month_shifts_zero_eligible.append(
                {
                    'shift_instance_id': s.id,
                    'date': s.date.isoformat(),
                    'category': s.category,
                    'role': s.role,
                    'area': s.area,
                    'time_of_day': s.time_of_day,
                }
            )

    # H2 bottleneck (pro Tag max. 1 Schicht je MA):
    # Wenn an einem Tag für eine Rolle mehr Schichten gefordert sind als es überhaupt
    # zulässige unterschiedliche MA gibt, ist das global INFEASIBLE (auch mit Overplanning).
    daily_role_bottlenecks: List[Dict[str, Any]] = []
    shifts_by_day_role: Dict[Tuple[date, str], List[int]] = defaultdict(list)
    for s in shifts:
        if pm_start <= s.date <= pm_end:
            shifts_by_day_role[(s.date, s.role)].append(s.index)
    for (d, role), s_indices in sorted(shifts_by_day_role.items(), key=lambda x: (x[0][0], x[0][1])):
        required_slots = len(s_indices)
        eligible_employee_ids: Set[int] = set()
        for e in employees:
            for s_idx in s_indices:
                if (e.index, s_idx) in x_keys:
                    eligible_employee_ids.add(e.id)
                    break
        max_assignable_due_h2 = len(eligible_employee_ids)
        if max_assignable_due_h2 < required_slots:
            daily_role_bottlenecks.append(
                {
                    'date': d.isoformat(),
                    'role': role,
                    'required_slots': required_slots,
                    'max_assignable_due_h2': max_assignable_due_h2,
                    'missing_slots': required_slots - max_assignable_due_h2,
                    'eligible_employee_ids': sorted(eligible_employee_ids),
                }
            )

    # Wochenende-Kopplung (AW + RB_WEEKEND NURSING):
    # Für Sa/So-Paare braucht es MA, die an BEIDEN Tagen zulässig sind.
    weekend_coupling_bottlenecks: List[Dict[str, Any]] = []
    grouped_aw: Dict[Tuple[int, str], Dict[str, List[int]]] = defaultdict(lambda: {'sat': [], 'sun': []})
    grouped_rb: Dict[Tuple[int, str, str], Dict[str, List[int]]] = defaultdict(lambda: {'sat': [], 'sun': []})
    for s in shifts:
        if not (pm_start <= s.date <= pm_end):
            continue
        wd = s.date.weekday()
        if wd not in (5, 6):
            continue
        day_key = 'sat' if wd == 5 else 'sun'
        if s.category == 'AW' and s.role == 'NURSING':
            grouped_aw[(s.calendar_week, s.area)][day_key].append(s.index)
        if s.category == 'RB_WEEKEND' and s.role == 'NURSING':
            grouped_rb[(s.calendar_week, s.area, s.time_of_day)][day_key].append(s.index)

    def _collect_common_eligible(sat_indices: List[int], sun_indices: List[int]) -> Set[int]:
        common: Set[int] = set()
        for e in employees:
            sat_ok = any((e.index, s_idx) in x_keys for s_idx in sat_indices)
            sun_ok = any((e.index, s_idx) in x_keys for s_idx in sun_indices)
            if sat_ok and sun_ok:
                common.add(e.id)
        return common

    for (cw, area), pair in sorted(grouped_aw.items(), key=lambda x: (x[0][0], x[0][1] or '')):
        sat_indices, sun_indices = pair['sat'], pair['sun']
        if not sat_indices or not sun_indices:
            continue
        # Bei aktivierter Overplanning sollen alle Schichten besetzt sein.
        required_pairs = min(len(sat_indices), len(sun_indices)) if allow_overplanning else 1
        common = _collect_common_eligible(sat_indices, sun_indices)
        if len(common) < required_pairs:
            weekend_coupling_bottlenecks.append(
                {
                    'calendar_week': cw,
                    'category': 'AW',
                    'area': area,
                    'time_of_day': 'NONE',
                    'required_common_employees': required_pairs,
                    'common_eligible_count': len(common),
                    'common_eligible_employee_ids': sorted(common),
                }
            )

    for (cw, area, tod), pair in sorted(grouped_rb.items(), key=lambda x: (x[0][0], x[0][1] or '', x[0][2] or '')):
        sat_indices, sun_indices = pair['sat'], pair['sun']
        if not sat_indices or not sun_indices:
            continue
        required_pairs = min(len(sat_indices), len(sun_indices)) if allow_overplanning else 1
        common = _collect_common_eligible(sat_indices, sun_indices)
        if len(common) < required_pairs:
            weekend_coupling_bottlenecks.append(
                {
                    'calendar_week': cw,
                    'category': 'RB_WEEKEND',
                    'area': area,
                    'time_of_day': tod,
                    'required_common_employees': required_pairs,
                    'common_eligible_count': len(common),
                    'common_eligible_employee_ids': sorted(common),
                }
            )

    n_abs_pm = sum(1 for (eid, d) in absent if pm_start <= d <= pm_end)
    emps_abs_pm = {eid for (eid, d) in absent if pm_start <= d <= pm_end}

    summary = {
        'allow_overplanning': allow_overplanning,
        'variables_pairs_count': len(x_keys),
        'fixed_assignments_input': len(ctx.fixed_assignments),
        'fixed_enforced_in_model': len(fixed_enforced),
        'fixed_dropped_no_variable': len(fixed_dropped),
        'fixed_conflict_same_shift_count': len(fixed_conflict_same_shift),
        'fixed_duplicate_same_day_count': len(fixed_duplicate_same_day),
        'planning_month_shifts_zero_eligible_count': len(planning_month_shifts_zero_eligible),
        'daily_role_bottleneck_count': len(daily_role_bottlenecks),
        'weekend_coupling_bottleneck_count': len(weekend_coupling_bottlenecks),
        'absence_markers_in_planning_month': n_abs_pm,
        'distinct_employees_absent_in_planning_month': len(emps_abs_pm),
    }

    hints: Dict[str, Any] = {
        'summary': summary,
        'fixed_conflict_same_shift': fixed_conflict_same_shift,
        'fixed_duplicate_same_day': fixed_duplicate_same_day,
        'fixed_dropped_samples': fixed_dropped[:40],
        'planning_month_shifts_with_zero_eligible': planning_month_shifts_zero_eligible[:80],
        'daily_role_bottlenecks': daily_role_bottlenecks[:80],
        'weekend_coupling_bottlenecks': weekend_coupling_bottlenecks[:80],
    }

    hints['human_readable'] = _human_readable_messages(hints, allow_overplanning)
    return hints


def _human_readable_messages(hints: Dict[str, Any], allow_overplanning: bool) -> List[str]:
    msgs: List[str] = []
    s = hints['summary']

    for c in hints.get('fixed_conflict_same_shift', []):
        emp_part = ', '.join(c.get('employee_labels') or [])
        msgs.append(
            f"Doppelte feste Zuweisung auf dieselbe Schicht: Instanz-ID {c['shift_instance_id']}, "
            f"Datum {c['shift_date']}, {c['category']} / {c['role']}, Bereich {c.get('area')}, "
            f"{c.get('time_of_day')} — mehrere Fixierungen gleichzeitig: {emp_part}. "
            'Das Modell erlaubt nur eine Person pro Schicht (z. B. doppelter Eintrag in der DB oder '
            'Aplano-Overlay plus bestehende Zuweisung).'
        )
    for dup in hints.get('fixed_duplicate_same_day', []):
        eid = dup.get('employee_id')
        who = f'MA #{eid}' if eid is not None else f"Index {dup.get('employee_index')}"
        parts = []
        for sh in dup.get('shifts', []):
            parts.append(
                f"ID {sh['shift_instance_id']} ({sh['category']}/{sh['role']}, {sh['area']}, {sh['time_of_day']})"
            )
        schichten = '; '.join(parts) if parts else str(dup.get('shift_instance_ids', []))
        msgs.append(
            f"{who} am {dup['date']}: mehrere feste Schichten am selben Tag: {schichten}. "
            'Pro Tag ist nur eine Zuweisung pro Person möglich.'
        )
    if s['fixed_dropped_no_variable']:
        msgs.append(
            f"{s['fixed_dropped_no_variable']} feste Zuweisung(en) aus DB/Aplano konnten im Modell nicht gesetzt werden "
            '(Abwesenheit, Rolle, oder Kapazität 0 für diese Schichtkategorie). Sie werden nicht erzwungen.'
        )
    if s['planning_month_shifts_zero_eligible_count']:
        extra = (
            ' Bei aktivierter Überplanung sind unbesetzbare Schichten ein Risiko für harte Regeln.'
            if allow_overplanning
            else ''
        )
        msgs.append(
            f"{s['planning_month_shifts_zero_eligible_count']} Schicht(en) im Planungsmonat ohne irgendeinen "
            f'zulässigen Mitarbeitenden (Rolle/Abwesenheit/Kapazität).{extra}'
        )
    if s.get('daily_role_bottleneck_count'):
        msgs.append(
            f"{s['daily_role_bottleneck_count']} Tages-/Rollen-Bottleneck(s): "
            'an diesen Tagen gibt es weniger zulässige unterschiedliche Mitarbeitende als benötigte Schichten '
            '(H2: max. 1 Schicht pro Person/Tag).'
        )
    if s.get('weekend_coupling_bottleneck_count'):
        msgs.append(
            f"{s['weekend_coupling_bottleneck_count']} Wochenend-Kopplungs-Bottleneck(s): "
            'für Sa/So (AW oder RB_WEEKEND) gibt es zu wenige Mitarbeitende, die an BEIDEN Tagen zulässig sind.'
        )
    if s['absence_markers_in_planning_month']:
        msgs.append(
            f"{s['absence_markers_in_planning_month']} Abwesenheits-Markierungen im Planungsmonat "
            f"({s['distinct_employees_absent_in_planning_month']} Mitarbeitende) — reduziert verfügbare Kapazität."
        )

    if not msgs:
        msgs.append(
            'Kein offensichtlicher struktureller Widerspruch in den festen Zuweisungen gefunden. '
            'Ursache kann die Kombination aus Wochenend-Kopplung (AW/RB), Tag/Nacht-Regeln und Kapazitäten sein.'
        )
    return msgs
