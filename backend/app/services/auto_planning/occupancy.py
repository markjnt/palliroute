"""
Classify existing DB assignments into solver commitments before model build.

Separates real absences from occupancy (busy days), and capacity maxima from
already-used out-of-scope duties.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from .capacity import capacity_type_for_fields, empty_capacity_counts


@dataclass(frozen=True)
class ExistingAssignmentRef:
    """Lightweight assignment + shift definition snapshot (no ORM required)."""

    employee_id: int
    shift_instance_id: int
    source: str  # SOLVER | MANUAL
    shift_date: date
    shift_month: str  # YYYY-MM
    category: str
    role: str
    time_of_day: str


@dataclass
class OccupancyCommitments:
    """What the world already looks like before the solver runs."""

    # (e_idx, s_idx) that must stay x==1
    fixed_assignments: set[tuple[int, int]] = field(default_factory=set)
    # In-scope shifts that must not receive a new solver person
    locked_shift_indices: set[int] = field(default_factory=set)
    # (employee_id, date) occupied by an out-of-scope duty that remains
    busy_dates: set[tuple[int, date]] = field(default_factory=set)
    # employee_id -> capacity_type -> count of remaining out-of-scope planning-month duties
    capacity_already_used: dict[int, dict[str, int]] = field(default_factory=dict)


@dataclass(frozen=True)
class _FixedCandidate:
    e_idx: int
    s_idx: int
    source: str


def _pick_fixed_winner(candidates: list[_FixedCandidate]) -> _FixedCandidate:
    """One assignee per shift: MANUAL over SOLVER, then lower employee index."""
    return min(
        candidates,
        key=lambda c: (0 if c.source.upper() == "MANUAL" else 1, c.e_idx),
    )


def classify_occupancy(
    *,
    existing: list[ExistingAssignmentRef],
    employee_id_to_idx: dict[int, int],
    shift_id_to_idx: dict[int, int],
    ctx_start: date,
    ctx_end: date,
    planning_month: str,
    existing_assignments_handling: str,
    has_external_prev_history: bool,
    plan_scope_active: bool,
    capacity_employee_ids: set[int] | None = None,
) -> OccupancyCommitments:
    """
    Project existing assignments onto fixed / locked / busy / capacity_already_used.

    Invariants:
    - plan_scope filters decision shifts; out-of-scope planning-month duties remain
      and block the day (busy) + consume capacity.
    - OVERWRITE keeps MANUAL; RESPECT keeps SOLVER+MANUAL.
    - Non-planable employees: lock in-scope shifts they still hold after the run
      (MANUAL always; SOLVER only under RESPECT — OVERWRITE deletes those SOLVER rows).
    - Per shift at most one commitment: lock XOR a single fixed pair (never both,
      never two fixed) so the CP-SAT model cannot become permanently infeasible.
    """
    respect = existing_assignments_handling.lower() == "respect"
    out = OccupancyCommitments()
    cap_ids = capacity_employee_ids if capacity_employee_ids is not None else set(employee_id_to_idx)
    fixed_candidates: list[_FixedCandidate] = []

    for a in existing:
        e_idx = employee_id_to_idx.get(a.employee_id)
        s_idx = shift_id_to_idx.get(a.shift_instance_id)
        shift_date = a.shift_date
        in_planning_window = shift_date >= ctx_start

        if e_idx is None:
            if s_idx is not None and in_planning_window:
                # Excluded MA still holding the shift after this run → lock it
                if a.source == "MANUAL" or respect:
                    out.locked_shift_indices.add(s_idx)
            continue

        if s_idx is None:
            # Out-of-scope (or otherwise not in decision set)
            if plan_scope_active and in_planning_window:
                out.busy_dates.add((a.employee_id, shift_date))
            if (
                plan_scope_active
                and a.employee_id in cap_ids
                and a.shift_month == planning_month
            ):
                cap_type = capacity_type_for_fields(a.category, a.role, a.time_of_day)
                if cap_type is not None:
                    used = out.capacity_already_used.setdefault(
                        a.employee_id, empty_capacity_counts()
                    )
                    used[cap_type] = used.get(cap_type, 0) + 1
            continue

        if shift_date < ctx_start:
            # Prev month from DB only when no Aplano soft history is supplied
            if not has_external_prev_history:
                fixed_candidates.append(_FixedCandidate(e_idx, s_idx, a.source))
        elif shift_date > ctx_end:
            fixed_candidates.append(_FixedCandidate(e_idx, s_idx, a.source))
        elif respect:
            fixed_candidates.append(_FixedCandidate(e_idx, s_idx, a.source))
        elif a.source == "MANUAL":
            fixed_candidates.append(_FixedCandidate(e_idx, s_idx, a.source))

    # Resolve conflicts: locked shift drops all fixed; else at most one fixed per shift
    by_shift: dict[int, list[_FixedCandidate]] = {}
    for cand in fixed_candidates:
        by_shift.setdefault(cand.s_idx, []).append(cand)

    for s_idx, cands in by_shift.items():
        if s_idx in out.locked_shift_indices:
            # Non-planable claim wins — forcing a second person to x==1 would be infeasible
            continue
        winner = _pick_fixed_winner(cands)
        out.fixed_assignments.add((winner.e_idx, winner.s_idx))

    return out
