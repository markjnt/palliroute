"""Request authentication middleware."""

from __future__ import annotations

from flask import Flask, g, jsonify, request

from .employee_lookup import (
    find_employee_for_claims,
    is_admin_account,
    parse_admin_emails,
    unmapped_account_info,
)
from .jwt_validator import validate_azure_token


def init_auth(app: Flask) -> None:
    @app.before_request
    def _authenticate():
        g.authenticated = False
        g.auth_mode = None
        g.claims = None
        g.employee = None
        g.is_admin = False

        if request.method == "OPTIONS":
            g.authenticated = True
            g.auth_mode = "disabled"
            return None

        if not request.path.startswith("/api/"):
            return None

        if not app.config.get("AUTH_ENABLED", True):
            g.authenticated = True
            g.auth_mode = "disabled"
            return None

        internal_key = app.config.get("INTERNAL_API_KEY")
        provided_key = request.headers.get("X-Internal-Api-Key")
        if internal_key and provided_key and provided_key == internal_key:
            g.authenticated = True
            g.auth_mode = "internal"
            return None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            try:
                claims = validate_azure_token(
                    token,
                    app.config.get("AZURE_TENANT_ID"),
                    app.config.get("AZURE_CLIENT_ID"),
                )
            except Exception as exc:
                app.logger.warning("JWT validation failed: %s", exc)
                return jsonify({"error": "Unauthorized", "message": "Invalid token"}), 401

            g.claims = claims
            g.auth_mode = "jwt"
            g.authenticated = True
            employee = find_employee_for_claims(claims)
            g.employee = employee
            g.is_admin = is_admin_account(
                claims,
                parse_admin_emails(app.config.get("ADMIN_EMAILS")),
            )

            # Unmapped users may only hit /api/auth/* unless they are allowlisted admins
            if employee is None and not g.is_admin and not request.path.startswith("/api/auth"):
                unmapped = unmapped_account_info(
                    claims,
                    entra_email_domain=app.config.get("ENTRA_EMAIL_DOMAIN") or "sapv-oberberg.de",
                    admin_emails=app.config.get("ADMIN_EMAILS"),
                )
                return jsonify(
                    {
                        "error": "Forbidden",
                        "code": unmapped["code"],
                        "message": unmapped["detail"],
                        "email": unmapped["email"],
                        "oid": unmapped["oid"],
                        "name": unmapped["name"],
                    }
                ), 403
            return None

        return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401
