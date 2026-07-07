from flask import jsonify, request

from app import db
from app.models.scheduling import EmployeeAutoPlanningPreference

from . import scheduling_bp

_VALID_DUTY_PREFERENCES = {"neutral", "aw", "rb"}
_VALID_AW_RHYTHMS = {"regular", "irregular"}


def _serialize_pref(pref: EmployeeAutoPlanningPreference) -> dict:
    return {
        "employee_id": pref.employee_id,
        "rb_even_weeks": pref.rb_even_weeks,
        "rb_odd_weeks": pref.rb_odd_weeks,
        "duty_preference": pref.duty_preference,
        "aw_rhythm": pref.aw_rhythm,
    }


@scheduling_bp.route("/employee-planning-preferences", methods=["GET"])
def get_employee_planning_preferences():
    """Get all persisted employee auto-planning preferences."""
    try:
        prefs = EmployeeAutoPlanningPreference.query.all()
        return jsonify([_serialize_pref(p) for p in prefs]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@scheduling_bp.route("/employee-planning-preferences", methods=["PUT"])
def upsert_employee_planning_preferences():
    """Bulk upsert persisted preferences (rb_even/odd, duty_preference, aw_rhythm)."""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({"error": "Expected a JSON array of preferences"}), 400

        existing = {p.employee_id: p for p in EmployeeAutoPlanningPreference.query.all()}
        updated = 0
        created = 0

        for item in data:
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
            if duty_pref not in _VALID_DUTY_PREFERENCES:
                duty_pref = "neutral"
            aw_rhythm = str(item.get("aw_rhythm", "regular")).lower()
            if aw_rhythm not in _VALID_AW_RHYTHMS:
                aw_rhythm = "regular"

            fields = {
                "rb_even_weeks": bool(item.get("rb_even_weeks", True)),
                "rb_odd_weeks": bool(item.get("rb_odd_weeks", True)),
                "duty_preference": duty_pref,
                "aw_rhythm": aw_rhythm,
            }

            if eid in existing:
                pref = existing[eid]
                for key, value in fields.items():
                    setattr(pref, key, value)
                updated += 1
            else:
                db.session.add(EmployeeAutoPlanningPreference(employee_id=eid, **fields))
                created += 1

        db.session.commit()
        prefs = EmployeeAutoPlanningPreference.query.all()
        return jsonify(
            {
                "message": "Preferences saved",
                "created": created,
                "updated": updated,
                "preferences": [_serialize_pref(p) for p in prefs],
            }
        ), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
