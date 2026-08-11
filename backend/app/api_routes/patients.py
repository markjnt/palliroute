import os
from datetime import UTC, datetime

from flask import Blueprint, current_app, jsonify, request

from app import db
from app.auth.decorators import require_internal
from app.models.patient import Patient
from app.models.system_info import SystemInfo
from app.services.excel_import_service import ExcelImportService
from app.services.import_job import get_patient_import_status, try_start_patient_import

patients_bp = Blueprint("patients", __name__)


def _find_newest_patient_import_file() -> str:
    directory_path = current_app.config.get("PATIENTS_IMPORT_PATH")
    if not directory_path:
        raise ValueError("PATIENTS_IMPORT_PATH not configured")
    if not os.path.exists(directory_path):
        raise ValueError(f"Directory not found: {directory_path}")
    if not os.path.isdir(directory_path):
        raise ValueError(f"Path is not a directory: {directory_path}")

    excel_files = []
    for file in os.listdir(directory_path):
        if file.endswith((".xlsx", ".xls")):
            file_path = os.path.join(directory_path, file)
            excel_files.append((file_path, os.path.getmtime(file_path)))

    if not excel_files:
        raise ValueError(f"No Excel files found in directory: {directory_path}")

    return max(excel_files, key=lambda x: x[1])[0]


def _build_import_response(result: dict) -> tuple[dict, int]:
    patients = result["patients"]
    appointments = result["appointments"]
    routes = result.get("routes", [])
    calendar_weeks = sorted({p.calendar_week for p in patients if p.calendar_week is not None})
    calendar_week = patients[0].calendar_week if patients else None
    current_time = datetime.now(UTC).astimezone().isoformat()
    SystemInfo.set_value("last_patient_import_time", current_time)
    calendar_weeks_str = ", ".join(map(str, calendar_weeks)) if calendar_weeks else "None"

    return {
        "message": (
            f"Erfolgreich {len(patients)} Patienten, {len(appointments)} Termine "
            f"und {len(routes)} Touren importiert"
        ),
        "patient_count": len(patients),
        "appointment_count": len(appointments),
        "route_count": len(routes),
        "calendar_week": calendar_week,
        "calendar_weeks": calendar_weeks,
        "calendar_weeks_str": calendar_weeks_str,
        "last_import_time": current_time,
    }, 200


@patients_bp.route("/calendar-weeks", methods=["GET"])
def get_available_calendar_weeks():
    """
    Get all available calendar weeks from patients
    Returns sorted list of unique calendar weeks
    """
    try:
        # Get unique calendar weeks from patients, excluding None/null values
        result = (
            db.session.query(Patient.calendar_week)
            .distinct()
            .filter(Patient.calendar_week.isnot(None))
            .all()
        )
        calendar_weeks = sorted([week[0] for week in result])

        return jsonify({"calendar_weeks": calendar_weeks, "count": len(calendar_weeks)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@patients_bp.route("/", methods=["GET"])
def get_patients():
    calendar_week = request.args.get("calendar_week", type=int)
    area = request.args.get("area", type=str)

    query = Patient.query

    if calendar_week:
        query = query.filter_by(calendar_week=calendar_week)

    if area:
        query = query.filter_by(area=area)

    patients = query.all()
    return jsonify([patient.to_dict() for patient in patients]), 200


@patients_bp.route("/<int:id>", methods=["GET"])
def get_patient(id):
    patient = Patient.query.get_or_404(id)
    return jsonify(patient.to_dict()), 200


@patients_bp.route("/import/status", methods=["GET"])
def patient_import_status():
    """Poll background patient import job status."""
    return jsonify(get_patient_import_status()), 200


@patients_bp.route("/import", methods=["POST"])
@require_internal
def import_patients():
    """
    Import patients and appointments from an Excel file.
    Default: async (202). Use ?sync=true to block until finished (scheduler).
    """
    sync = request.args.get("sync", "").lower() in ("1", "true", "yes")

    try:
        newest_file = _find_newest_patient_import_file()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if sync:
        try:
            print(f"Starting synchronous import from file: {newest_file}")
            result = ExcelImportService.import_patients(newest_file)
            body, status = _build_import_response(result)
            return jsonify(body), status
        except Exception as e:
            db.session.rollback()
            print(f"Error during import: {e}")
            return jsonify({"error": str(e)}), 400

    if not try_start_patient_import(current_app._get_current_object(), newest_file):
        return jsonify({"error": "Import läuft bereits", "status": "running"}), 409

    return jsonify({"message": "Import gestartet", "status": "running"}), 202
