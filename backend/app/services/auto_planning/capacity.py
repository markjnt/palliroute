"""
Shared capacity-type taxonomy for auto-planning.

Capacity buckets are area-agnostic (e.g. RB_NURSING_WEEKDAY covers Nord and Süd).
"""

from __future__ import annotations

from typing import Protocol

# Capacity type -> (category, role, time_of_day filter: None = any)
CAPACITY_SHIFT_FILTER: dict[str, tuple[str, str, str | None]] = {
    "RB_NURSING_WEEKDAY": ("RB_WEEKDAY", "NURSING", "NONE"),
    "RB_NURSING_WEEKEND": ("RB_WEEKEND", "NURSING", None),  # DAY+NIGHT together
    "RB_DOCTORS_WEEKDAY": ("RB_WEEKDAY", "DOCTOR", "NONE"),
    "RB_DOCTORS_WEEKEND": ("RB_WEEKEND", "DOCTOR", "NONE"),
    "AW_NURSING": ("AW", "NURSING", "NONE"),
}

CAPACITY_TYPES: tuple[str, ...] = tuple(CAPACITY_SHIFT_FILTER.keys())


class ShiftCapacityFields(Protocol):
    category: str
    role: str
    time_of_day: str


def capacity_type_for_fields(
    category: str | None, role: str | None, time_of_day: str | None
) -> str | None:
    """Map shift definition fields to a capacity bucket, or None if none."""
    cat = (category or "").upper()
    role_u = (role or "").upper()
    tod = (time_of_day or "").upper()
    for cap_type, (f_cat, f_role, f_tod) in CAPACITY_SHIFT_FILTER.items():
        if cat != f_cat or role_u != f_role:
            continue
        if f_tod is None or tod == f_tod:
            return cap_type
    return None


def capacity_type_for_shift(shift: ShiftCapacityFields) -> str | None:
    return capacity_type_for_fields(shift.category, shift.role, shift.time_of_day)


def shift_matches_capacity(shift: ShiftCapacityFields, cap_type: str) -> bool:
    cat, role, tod = CAPACITY_SHIFT_FILTER[cap_type]
    if shift.category != cat or shift.role != role:
        return False
    if tod is None:
        return True
    return shift.time_of_day == tod


def capacity_remaining(max_count: int, already_used: int) -> int:
    """How many more duties of this type may be assigned in the planning month."""
    return max(0, max_count - already_used)


def empty_capacity_counts() -> dict[str, int]:
    return {ct: 0 for ct in CAPACITY_TYPES}
