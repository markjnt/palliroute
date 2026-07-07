"""Background patient import job (status persisted in SystemInfo for multi-worker Gunicorn)."""

from __future__ import annotations

import json
import threading
from datetime import UTC, datetime
from typing import Any

from app.models.system_info import SystemInfo

PATIENT_IMPORT_STATUS_KEY = "patient_import_status"

_lock = threading.Lock()


def _default_status() -> dict[str, Any]:
    return {
        "status": "idle",
        "error": None,
        "result": None,
        "started_at": None,
        "finished_at": None,
    }


def get_patient_import_status() -> dict[str, Any]:
    raw = SystemInfo.get_value(PATIENT_IMPORT_STATUS_KEY)
    if not raw:
        return _default_status()
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return {**_default_status(), **data}
    except json.JSONDecodeError:
        pass
    return _default_status()


def _set_patient_import_status(data: dict[str, Any]) -> None:
    SystemInfo.set_value(PATIENT_IMPORT_STATUS_KEY, json.dumps(data))


def try_start_patient_import(app, file_path: str) -> bool:
    """Start import in a background thread. Returns False if already running."""
    with _lock:
        status = get_patient_import_status()
        if status.get("status") == "running":
            return False
        _set_patient_import_status(
            {
                "status": "running",
                "error": None,
                "result": None,
                "started_at": datetime.now(UTC).isoformat(),
                "finished_at": None,
            }
        )

    thread = threading.Thread(
        target=_run_patient_import,
        args=(app, file_path),
        name="patient-import",
        daemon=True,
    )
    thread.start()
    return True


def _run_patient_import(app, file_path: str) -> None:
    from app.services.excel_import_service import ExcelImportService

    with app.app_context():
        try:
            result = ExcelImportService.import_patients(file_path)
            patients = result["patients"]
            appointments = result["appointments"]
            routes = result.get("routes", [])
            calendar_weeks = sorted(
                {p.calendar_week for p in patients if p.calendar_week is not None}
            )
            calendar_week = patients[0].calendar_week if patients else None
            calendar_weeks_str = ", ".join(map(str, calendar_weeks)) if calendar_weeks else "None"
            current_time = datetime.now(UTC).astimezone().isoformat()
            SystemInfo.set_value("last_patient_import_time", current_time)

            payload = {
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
            }
            _set_patient_import_status(
                {
                    "status": "completed",
                    "error": None,
                    "result": payload,
                    "finished_at": datetime.now(UTC).isoformat(),
                }
            )
        except Exception as e:
            _set_patient_import_status(
                {
                    "status": "failed",
                    "error": str(e),
                    "result": None,
                    "finished_at": datetime.now(UTC).isoformat(),
                }
            )
