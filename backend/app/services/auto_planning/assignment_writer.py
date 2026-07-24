"""
Write solver assignments to the database (RESPECT vs OVERWRITE).
"""

import logging

from app import db
from app.models.scheduling import Assignment

logger = logging.getLogger(__name__)
SOURCE_SOLVER = "SOLVER"


def write_assignments(
    assignments: list[tuple[int, int]],
    start_date,
    end_date,
    existing_assignments_handling: str,
    shift_instance_ids: set[int] | None = None,
) -> int:
    """
    Persist assignments to DB. Each item is (employee_id, shift_instance_id).

    - OVERWRITE: delete SOLVER assignments in scope, then insert new ones.
      If shift_instance_ids is set, only those shifts are cleared (partial plan_scope).
      Otherwise all SOLVER assignments in [start_date, end_date] are cleared.
    - RESPECT: only insert assignments that are not already present (do not delete existing).
    """
    logger.info(
        "write_assignments: %s assignments, mode=%s, scoped_shifts=%s",
        len(assignments),
        existing_assignments_handling,
        len(shift_instance_ids) if shift_instance_ids is not None else "all",
    )
    if existing_assignments_handling.lower() == "overwrite":
        from app.models.scheduling import ShiftInstance

        if shift_instance_ids is not None:
            # Partial plan_scope: never touch assignments outside the selected duty groups
            ids_to_clear = shift_instance_ids
        else:
            ids_to_clear = {
                row[0]
                for row in db.session.query(ShiftInstance.id)
                .filter(
                    ShiftInstance.date >= start_date,
                    ShiftInstance.date <= end_date,
                )
                .all()
            }
        deleted = 0
        if ids_to_clear:
            deleted = (
                db.session.query(Assignment)
                .filter(
                    Assignment.source == SOURCE_SOLVER,
                    Assignment.shift_instance_id.in_(ids_to_clear),
                )
                .delete(synchronize_session=False)
            )
            db.session.commit()
        logger.info("write_assignments: deleted %s existing SOLVER assignments in scope", deleted)
    created = 0
    skipped = 0
    for employee_id, shift_instance_id in assignments:
        # Skip if this pair already exists (e.g. MANUAL kept through OVERWRITE)
        existing_pair = Assignment.query.filter_by(
            employee_id=employee_id,
            shift_instance_id=shift_instance_id,
        ).first()
        if existing_pair:
            skipped += 1
            continue
        # Never double-staff a shift that already has someone (MANUAL, or RESPECT leftover)
        existing_on_shift = Assignment.query.filter_by(
            shift_instance_id=shift_instance_id,
        ).first()
        if existing_on_shift:
            skipped += 1
            continue
        a = Assignment(
            employee_id=employee_id,
            shift_instance_id=shift_instance_id,
            source=SOURCE_SOLVER,
        )
        db.session.add(a)
        created += 1
    db.session.commit()
    logger.info("write_assignments: created %s, skipped (already exist) %s", created, skipped)
    return created
