"""Current user / auth info."""

from flask import Blueprint, current_app, g, jsonify

from .employee_lookup import _token_email, unmapped_account_info

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/me", methods=["GET"])
def auth_me():
    if getattr(g, "auth_mode", None) == "internal":
        return jsonify(
            {"auth_mode": "internal", "employee": None, "is_admin": False, "unmapped": None}
        ), 200

    if getattr(g, "auth_mode", None) == "disabled":
        return jsonify(
            {"auth_mode": "disabled", "employee": None, "is_admin": False, "unmapped": None}
        ), 200

    claims = getattr(g, "claims", None) or {}
    employee = getattr(g, "employee", None)
    is_admin = bool(getattr(g, "is_admin", False))
    unmapped = None
    if employee is None:
        unmapped = unmapped_account_info(
            claims,
            entra_email_domain=current_app.config.get("ENTRA_EMAIL_DOMAIN") or "sapv-oberberg.de",
            admin_emails=current_app.config.get("ADMIN_EMAILS"),
        )

    return jsonify(
        {
            "auth_mode": "jwt",
            "oid": claims.get("oid") or claims.get("sub"),
            "email": _token_email(claims),
            "name": claims.get("name"),
            "employee": employee.to_dict() if employee else None,
            "is_admin": is_admin,
            "unmapped": unmapped,
        }
    ), 200
