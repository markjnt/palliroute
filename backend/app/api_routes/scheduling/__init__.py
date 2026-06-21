from flask import Blueprint

# Create the main scheduling blueprint
scheduling_bp = Blueprint("scheduling", __name__)

# Import all route modules to register their endpoints
from . import assignments, employee_capacities, shift_definitions, shift_instances
