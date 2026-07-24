"""Tests: previous-month shifts are context-only in the CP-SAT model."""

from datetime import date

from app.services.auto_planning.data_loader import PlanableEmployee, PlanningContext, ShiftInfo
from app.services.auto_planning.model_builder import _is_decision_shift, build_model


def _shift(
    index: int,
    *,
    shift_id: int,
    d: date,
    month: str,
    category: str = "RB_WEEKDAY",
    role: str = "NURSING",
) -> ShiftInfo:
    return ShiftInfo(
        index=index,
        id=shift_id,
        date=d,
        calendar_week=d.isocalendar()[1],
        month=month,
        category=category,
        role=role,
        area="Nord",
        time_of_day="NONE",
        is_weekday=d.weekday() < 5,
        is_weekend=d.weekday() >= 5,
    )


def test_is_decision_shift_from_planning_start():
    s_prev = _shift(0, shift_id=1, d=date(2026, 2, 20), month="2026-02")
    s_plan = _shift(1, shift_id=2, d=date(2026, 3, 2), month="2026-03")
    assert _is_decision_shift(s_prev, date(2026, 3, 1)) is False
    assert _is_decision_shift(s_plan, date(2026, 3, 1)) is True


def test_prev_month_vars_only_for_fixed_or_preferred_history():
    emp = PlanableEmployee(index=0, id=10, role="NURSING", area="Nord")
    prev_a = _shift(0, shift_id=100, d=date(2026, 2, 10), month="2026-02")
    prev_b = _shift(1, shift_id=101, d=date(2026, 2, 11), month="2026-02")
    plan = _shift(2, shift_id=200, d=date(2026, 3, 5), month="2026-03")
    ctx = PlanningContext(
        planning_month="2026-03",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 31),
        prev_month_start=date(2026, 2, 1),
        prev_month_end=date(2026, 2, 28),
        employees=[emp],
        shifts=[prev_a, prev_b, plan],
        capacity_max={10: {"RB_NURSING_WEEKDAY": 4, "RB_NURSING_WEEKEND": 0, "RB_DOCTORS_WEEKDAY": 0, "RB_DOCTORS_WEEKEND": 0, "AW_NURSING": 0}},
        fixed_assignments={(0, 0)},  # only prev_a fixed
        preferred_assignments={(0, 1)},  # prev_b preferred
        employee_id_to_idx={10: 0},
        shift_id_to_idx={100: 0, 101: 1, 200: 2},
    )
    model = build_model(ctx, allow_overplanning=False)
    prev_pairs = {(e, s) for (e, s) in model.pairs if ctx.shifts[s].date < ctx.start_date}
    plan_pairs = {(e, s) for (e, s) in model.pairs if ctx.shifts[s].date >= ctx.start_date}
    assert prev_pairs == {(0, 0), (0, 1)}
    assert plan_pairs == {(0, 2)}


def test_prev_month_without_history_has_no_vars():
    emp = PlanableEmployee(index=0, id=10, role="NURSING", area="Nord")
    prev = _shift(0, shift_id=100, d=date(2026, 2, 10), month="2026-02")
    plan = _shift(1, shift_id=200, d=date(2026, 3, 5), month="2026-03")
    ctx = PlanningContext(
        planning_month="2026-03",
        start_date=date(2026, 3, 1),
        end_date=date(2026, 3, 31),
        prev_month_start=date(2026, 2, 1),
        prev_month_end=date(2026, 2, 28),
        employees=[emp],
        shifts=[prev, plan],
        capacity_max={10: {"RB_NURSING_WEEKDAY": 4, "RB_NURSING_WEEKEND": 0, "RB_DOCTORS_WEEKDAY": 0, "RB_DOCTORS_WEEKEND": 0, "AW_NURSING": 0}},
        fixed_assignments=set(),
        preferred_assignments=set(),
        employee_id_to_idx={10: 0},
        shift_id_to_idx={100: 0, 200: 1},
    )
    model = build_model(ctx, allow_overplanning=False)
    assert all(ctx.shifts[s].date >= ctx.start_date for (_, s) in model.pairs)
