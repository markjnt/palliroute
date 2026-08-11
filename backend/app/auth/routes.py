"""Current user / auth info."""

from flask import Blueprint, g, jsonify

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/me", methods=["GET"])
def auth_me():
    if getattr(g, "auth_mode", None) == "internal":
        return jsonify({"auth_mode": "internal", "employee": None}), 200

    if getattr(g, "auth_mode", None) == "disabled":
        return jsonify({"auth_mode": "disabled", "employee": None}), 200

    claims = getattr(g, "claims", None) or {}
    employee = getattr(g, "employee", None)

    return jsonify(
        {
            "auth_mode": "jwt",
            "oid": claims.get("oid") or claims.get("sub"),
            "email": claims.get("email")
            or claims.get("preferred_username")
            or claims.get("upn"),
            "name": claims.get("name"),
            "employee": employee.to_dict() if employee else None,
        }
    ), 200
