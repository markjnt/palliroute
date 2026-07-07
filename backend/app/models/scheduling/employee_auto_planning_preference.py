from app import db


class EmployeeAutoPlanningPreference(db.Model):
    """Persisted RB/AW auto-planning preferences per employee (excludes per-run inclusion)."""

    __tablename__ = "employee_auto_planning_preferences"

    id = db.Column(db.Integer, primary_key=True)

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    rb_even_weeks = db.Column(db.Boolean, nullable=False, default=True)
    rb_odd_weeks = db.Column(db.Boolean, nullable=False, default=True)
    duty_preference = db.Column(db.String(20), nullable=False, default="neutral")
    aw_rhythm = db.Column(db.String(20), nullable=False, default="regular")

    employee = db.relationship("Employee")
