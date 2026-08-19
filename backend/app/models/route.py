import json
from datetime import datetime

from app import db


def parse_appointment_ids(value) -> list[int]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        raw = value
    else:
        try:
            raw = json.loads(value)
        except (TypeError, json.JSONDecodeError):
            raw = []
    if not isinstance(raw, list):
        return []
    ids: list[int] = []
    for item in raw:
        try:
            ids.append(int(item))
        except (TypeError, ValueError):
            continue
    return ids


def same_appointment_ids(left: list[int], right: list[int]) -> bool:
    return sorted(left) == sorted(right)


class Route(db.Model):
    __tablename__ = "routes"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(
        db.Integer, db.ForeignKey("employees.id"), nullable=True
    )  # Nullable for weekend routes
    weekday = db.Column(db.String(20), nullable=False)
    route_order = db.Column(db.Text, nullable=False)  # JSON Array of appointment ids
    total_duration = db.Column(db.Integer, nullable=False)  # in minutes
    total_distance = db.Column(db.Float, nullable=True)  # in kilometers
    polyline = db.Column(db.Text, nullable=True)  # Encoded polyline of the route
    custom_order = db.Column(db.Text, nullable=False, default="[]")
    custom_order_active = db.Column(db.Boolean, nullable=False, default=False)
    custom_polyline = db.Column(db.Text, nullable=True)
    custom_distance = db.Column(db.Float, nullable=True)
    custom_duration = db.Column(db.Integer, nullable=True)
    area = db.Column(db.String(50), nullable=False)  # Nordkreis, Südkreis, etc.
    calendar_week = db.Column(db.Integer, nullable=True)  # Denormalized for easier filtering
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_route_order(self) -> list[int]:
        return parse_appointment_ids(self.route_order)

    def get_custom_order(self) -> list[int]:
        return parse_appointment_ids(self.custom_order)

    def set_route_order(self, appointment_ids):
        ids = [int(item) for item in appointment_ids]
        self.route_order = json.dumps(ids)
        if not self.custom_order_active:
            self.custom_order = json.dumps(ids)
            self.sync_custom_metrics_from_web()

    def set_custom_order(self, appointment_ids, active: bool = True):
        ids = [int(item) for item in appointment_ids]
        self.custom_order = json.dumps(ids)
        self.custom_order_active = active
        if not active:
            self.sync_custom_metrics_from_web()

    def reset_custom_order(self):
        self.custom_order_active = False
        self.custom_order = json.dumps(self.get_route_order())
        self.sync_custom_metrics_from_web()

    def sync_custom_metrics_from_web(self):
        if self.custom_order_active:
            return
        self.custom_polyline = self.polyline
        self.custom_distance = self.total_distance
        self.custom_duration = self.total_duration

    def remove_appointment_id(self, appointment_id: int) -> None:
        aid = int(appointment_id)
        self.route_order = json.dumps([item for item in self.get_route_order() if item != aid])
        self.custom_order = json.dumps([item for item in self.get_custom_order() if item != aid])

    def append_appointment_id(self, appointment_id: int) -> None:
        aid = int(appointment_id)
        order = self.get_route_order()
        if aid not in order:
            order.append(aid)
        self.route_order = json.dumps(order)
        if self.custom_order_active:
            custom = self.get_custom_order()
            if aid not in custom:
                custom.append(aid)
            self.custom_order = json.dumps(custom)
        else:
            self.custom_order = json.dumps(order)

    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "weekday": self.weekday,
            "route_order": self.get_route_order(),
            "total_duration": self.total_duration,
            "total_distance": self.total_distance,
            "polyline": self.polyline,
            "custom_order": self.get_custom_order(),
            "custom_order_active": bool(self.custom_order_active),
            "custom_polyline": self.custom_polyline,
            "custom_distance": self.custom_distance,
            "custom_duration": self.custom_duration,
            "area": self.area,
            "calendar_week": self.calendar_week,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
