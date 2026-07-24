"""Unit tests for auto-planning occupancy classification and capacity helpers."""

from datetime import date

from app.services.auto_planning.capacity import (
    capacity_remaining,
    capacity_type_for_fields,
)
from app.services.auto_planning.occupancy import (
    ExistingAssignmentRef,
    classify_occupancy,
)


def _ref(
    *,
    employee_id: int = 1,
    shift_instance_id: int = 100,
    source: str = "SOLVER",
    shift_date: date = date(2026, 3, 10),
    shift_month: str = "2026-03",
    category: str = "RB_WEEKDAY",
    role: str = "NURSING",
    time_of_day: str = "NONE",
) -> ExistingAssignmentRef:
    return ExistingAssignmentRef(
        employee_id=employee_id,
        shift_instance_id=shift_instance_id,
        source=source,
        shift_date=shift_date,
        shift_month=shift_month,
        category=category,
        role=role,
        time_of_day=time_of_day,
    )


def test_capacity_type_mapping_area_agnostic():
    assert capacity_type_for_fields("RB_WEEKDAY", "NURSING", "NONE") == "RB_NURSING_WEEKDAY"
    assert capacity_type_for_fields("RB_WEEKEND", "NURSING", "DAY") == "RB_NURSING_WEEKEND"
    assert capacity_type_for_fields("AW", "NURSING", "NONE") == "AW_NURSING"
    assert capacity_remaining(4, 2) == 2
    assert capacity_remaining(2, 5) == 0


def test_out_of_scope_marks_busy_and_capacity_used():
    """Partial plan_scope: remaining Nord duty blocks day and consumes capacity."""
    occ = classify_occupancy(
        existing=[_ref(shift_instance_id=999)],  # not in decision set
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 0},  # only Süd (id 100) is in scope
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="overwrite",
        has_external_prev_history=False,
        plan_scope_active=True,
        capacity_employee_ids={1},
    )
    assert (1, date(2026, 3, 10)) in occ.busy_dates
    assert occ.capacity_already_used[1]["RB_NURSING_WEEKDAY"] == 1
    assert occ.fixed_assignments == set()


def test_respect_fixes_in_scope_solver_assignment():
    occ = classify_occupancy(
        existing=[_ref(source="SOLVER")],
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 5},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="respect",
        has_external_prev_history=False,
        plan_scope_active=False,
    )
    assert (0, 5) in occ.fixed_assignments


def test_overwrite_keeps_manual_but_not_solver():
    occ = classify_occupancy(
        existing=[
            _ref(source="SOLVER", shift_instance_id=100),
            _ref(source="MANUAL", shift_instance_id=101, shift_date=date(2026, 3, 11)),
        ],
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 0, 101: 1},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="overwrite",
        has_external_prev_history=False,
        plan_scope_active=False,
    )
    assert (0, 0) not in occ.fixed_assignments
    assert (0, 1) in occ.fixed_assignments


def test_excluded_employee_locks_solver_under_respect_only():
    """Excluded MA with SOLVER on in-scope shift: lock under RESPECT, not under OVERWRITE."""
    common = dict(
        existing=[_ref(employee_id=99, source="SOLVER")],
        employee_id_to_idx={},  # excluded
        shift_id_to_idx={100: 3},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        has_external_prev_history=False,
        plan_scope_active=True,
    )
    respect = classify_occupancy(
        existing_assignments_handling="respect",
        **common,
    )
    overwrite = classify_occupancy(
        existing_assignments_handling="overwrite",
        **common,
    )
    assert 3 in respect.locked_shift_indices
    assert 3 not in overwrite.locked_shift_indices


def test_excluded_employee_always_locks_manual():
    occ = classify_occupancy(
        existing=[_ref(employee_id=99, source="MANUAL")],
        employee_id_to_idx={},
        shift_id_to_idx={100: 3},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="overwrite",
        has_external_prev_history=False,
        plan_scope_active=True,
    )
    assert 3 in occ.locked_shift_indices


def test_prev_month_fixed_unless_aplano_history():
    prev = _ref(shift_date=date(2026, 2, 20), shift_month="2026-02")
    with_db = classify_occupancy(
        existing=[prev],
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 2},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="respect",
        has_external_prev_history=False,
        plan_scope_active=False,
    )
    with_aplano = classify_occupancy(
        existing=[prev],
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 2},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="respect",
        has_external_prev_history=True,
        plan_scope_active=False,
    )
    assert (0, 2) in with_db.fixed_assignments
    assert with_aplano.fixed_assignments == set()


def test_out_of_scope_does_not_double_count_in_scope_capacity():
    """In-scope duties are counted by the model, not capacity_already_used."""
    occ = classify_occupancy(
        existing=[_ref(shift_instance_id=100)],
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 0},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="respect",
        has_external_prev_history=False,
        plan_scope_active=True,
        capacity_employee_ids={1},
    )
    assert occ.capacity_already_used == {}
    assert (0, 0) in occ.fixed_assignments


def test_lock_wins_over_fixed_on_same_shift():
    """Excluded MANUAL lock + planable SOLVER on same shift → lock only (no INFEASIBLE)."""
    occ = classify_occupancy(
        existing=[
            _ref(employee_id=99, source="MANUAL", shift_instance_id=100),
            _ref(employee_id=1, source="SOLVER", shift_instance_id=100),
        ],
        employee_id_to_idx={1: 0},
        shift_id_to_idx={100: 3},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="respect",
        has_external_prev_history=False,
        plan_scope_active=True,
    )
    assert 3 in occ.locked_shift_indices
    assert occ.fixed_assignments == set()


def test_two_fixed_on_same_shift_keeps_manual_winner():
    occ = classify_occupancy(
        existing=[
            _ref(employee_id=1, source="SOLVER", shift_instance_id=100),
            _ref(employee_id=2, source="MANUAL", shift_instance_id=100),
        ],
        employee_id_to_idx={1: 0, 2: 1},
        shift_id_to_idx={100: 3},
        ctx_start=date(2026, 3, 1),
        ctx_end=date(2026, 3, 31),
        planning_month="2026-03",
        existing_assignments_handling="respect",
        has_external_prev_history=False,
        plan_scope_active=False,
    )
    assert occ.fixed_assignments == {(1, 3)}
    assert occ.locked_shift_indices == set()
