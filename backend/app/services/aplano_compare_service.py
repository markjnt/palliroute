from datetime import datetime
from typing import Any, Dict, List, Optional

from app import db
from app.models.employee import Employee
from app.models.scheduling import Assignment, ShiftDefinition, ShiftInstance

from .aplano_sync import (
    aplano_user_display_name,
    fetch_aplano_shifts_for_month,
    match_employee_by_name,
)
from .auto_planning_service import AutoPlanningService


def _slot_key_from_parts(
    shift_date,
    category: str,
    role: str,
    area: Optional[str],
    time_of_day: str,
) -> str:
    return f'{shift_date.isoformat()}|{category}|{role}|{area or ""}|{time_of_day}'


def compare_month_with_aplano(month: str) -> Dict[str, Any]:
    """
    Compare internal RB/AW assignments with Aplano shifts for one month (YYYY-MM).
    """
    try:
        month_start = datetime.strptime(month, '%Y-%m').date().replace(day=1)
    except ValueError:
        return {
            'message': 'Ungültiges Monatsformat. Erwartet wird YYYY-MM.',
            'error': 'BAD_MONTH_FORMAT',
        }

    try:
        raw_shifts = fetch_aplano_shifts_for_month(month_start)
    except Exception:
        return {
            'message': 'Aplano ist nicht verfügbar.',
            'error': 'APLANO_UNAVAILABLE',
        }

    employees = list(Employee.query.all())
    employee_name_by_id = {emp.id: f'{emp.first_name} {emp.last_name}'.strip() for emp in employees}
    mapper = AutoPlanningService()

    internal_rows = (
        db.session.query(Assignment, ShiftInstance, ShiftDefinition)
        .join(ShiftInstance, Assignment.shift_instance_id == ShiftInstance.id)
        .join(ShiftDefinition, ShiftInstance.shift_definition_id == ShiftDefinition.id)
        .filter(ShiftInstance.month == month)
        .filter(ShiftDefinition.category.in_(['RB_WEEKDAY', 'RB_WEEKEND', 'AW']))
        .all()
    )

    internal_by_slot: Dict[str, List[Dict[str, Any]]] = {}
    for assignment, shift_instance, shift_definition in internal_rows:
        slot_key = _slot_key_from_parts(
            shift_instance.date,
            shift_definition.category,
            shift_definition.role,
            shift_definition.area,
            shift_definition.time_of_day,
        )
        internal_by_slot.setdefault(slot_key, []).append({
            'assignment_id': assignment.id,
            'employee_id': assignment.employee_id,
            'employee_name': employee_name_by_id.get(assignment.employee_id),
            'date': shift_instance.date.isoformat(),
            'category': shift_definition.category,
            'role': shift_definition.role,
            'area': shift_definition.area,
            'time_of_day': shift_definition.time_of_day,
        })

    aplano_by_slot: Dict[str, List[Dict[str, Any]]] = {}
    skip_reasons: Dict[str, int] = {}
    for shift in raw_shifts:
        user_name = aplano_user_display_name(shift.get('user'))
        mapped_slots, skip = mapper._map_aplano_shift_to_solver_slots(shift)
        if skip:
            skip_reasons[skip] = skip_reasons.get(skip, 0) + 1
        if not mapped_slots:
            continue

        emp = match_employee_by_name(user_name, employees) if user_name else None
        for mapped in mapped_slots:
            if mapped['date'].strftime('%Y-%m') != month:
                continue
            slot_key = _slot_key_from_parts(
                mapped['date'],
                mapped['category'],
                mapped['role'],
                mapped.get('area'),
                mapped['time_of_day'],
            )
            aplano_by_slot.setdefault(slot_key, []).append({
                'employee_id': emp.id if emp else None,
                'employee_name': user_name,
                'date': mapped['date'].isoformat(),
                'category': mapped['category'],
                'role': mapped['role'],
                'area': mapped.get('area'),
                'time_of_day': mapped['time_of_day'],
            })

    details: List[Dict[str, Any]] = []
    all_slot_keys = sorted(set(internal_by_slot.keys()) | set(aplano_by_slot.keys()))

    for slot_key in all_slot_keys:
        internal_entries = internal_by_slot.get(slot_key, [])
        internal = internal_entries[0] if internal_entries else None
        aplano_entries = aplano_by_slot.get(slot_key, [])
        aplano = aplano_entries[0] if aplano_entries else None

        if internal and not aplano:
            reason = 'multiple_internal_assignments' if len(internal_entries) > 1 else 'missing_in_aplano'
            details.append({
                'status': 'missing_in_aplano' if reason == 'missing_in_aplano' else 'different',
                'reason': reason,
                'date': internal['date'],
                'category': internal['category'],
                'role': internal['role'],
                'area': internal['area'],
                'time_of_day': internal['time_of_day'],
                'employee_internal': {
                    'id': internal['employee_id'],
                    'name': internal['employee_name'],
                },
                'employee_aplano': None,
            })
            continue

        if aplano and not internal:
            details.append({
                'status': 'different',
                'reason': 'missing_internal_assignment',
                'date': aplano['date'],
                'category': aplano['category'],
                'role': aplano['role'],
                'area': aplano['area'],
                'time_of_day': aplano['time_of_day'],
                'employee_internal': None,
                'employee_aplano': {
                    'id': aplano['employee_id'],
                    'name': aplano['employee_name'],
                },
            })
            continue

        reason = None
        if len(internal_entries) > 1:
            reason = 'multiple_internal_assignments'
        elif len(aplano_entries) > 1:
            reason = 'multiple_aplano_assignments'
        elif internal['employee_id'] != aplano['employee_id']:
            reason = 'employee_mismatch'

        details.append({
            'status': 'equal' if reason is None else 'different',
            'reason': reason,
            'date': internal['date'],
            'category': internal['category'],
            'role': internal['role'],
            'area': internal['area'],
            'time_of_day': internal['time_of_day'],
            'employee_internal': {
                'id': internal['employee_id'],
                'name': internal['employee_name'],
            },
            'employee_aplano': {
                'id': aplano['employee_id'],
                'name': aplano['employee_name'],
            },
        })

    equal_count = sum(1 for row in details if row['status'] == 'equal')
    missing_in_aplano_count = sum(1 for row in details if row['status'] == 'missing_in_aplano')
    different_count = sum(1 for row in details if row['status'] == 'different')

    return {
        'month': month,
        'message': 'Aplano-Abgleich erfolgreich erstellt',
        'summary': {
            'total_compared': len(details),
            'equal_count': equal_count,
            'missing_in_aplano_count': missing_in_aplano_count,
            'different_count': different_count,
            'aplano_shift_rows': len(raw_shifts),
            'aplano_skipped': skip_reasons,
        },
        'details': details,
    }
