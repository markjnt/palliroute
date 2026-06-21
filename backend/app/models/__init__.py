# Import all models so Flask-Migrate can detect them
from . import (
    appointment,
    employee,
    employee_planning,
    patient,
    pflegeheim,
    route,
    scheduling,
    system_info,
)
