from flask import Blueprint

from app.auth.decorators import enforce_internal

# Create the main scheduling blueprint
scheduling_bp = Blueprint("scheduling", __name__)


@scheduling_bp.before_request
def _require_internal():
    return enforce_internal()


# Import all route modules to register their endpoints
from . import (
    assignments,
    employee_capacities,
    employee_planning_preferences,
    shift_definitions,
    shift_instances,
)
