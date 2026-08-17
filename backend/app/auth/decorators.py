"""Auth decorators and helpers."""

from __future__ import annotations

from functools import wraps

from flask import g, jsonify


def require_auth(fn):
    """Route already gated by middleware; kept for explicit marking / clarity."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not getattr(g, "authenticated", False):
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)

    return wrapper


def require_internal(fn):
    """Allow only Internal-Key or AUTH_ENABLED=false (Web / Scheduler), not PWA JWT."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not getattr(g, "authenticated", False):
            return jsonify({"error": "Unauthorized"}), 401
        if getattr(g, "auth_mode", None) in ("internal", "disabled"):
            return fn(*args, **kwargs)
        return jsonify({"error": "Forbidden", "message": "Internal access required"}), 403

    return wrapper


def enforce_internal():
    """Return a Flask error response or None if allowed (for before_request)."""
    if not getattr(g, "authenticated", False):
        return jsonify({"error": "Unauthorized"}), 401
    if getattr(g, "auth_mode", None) in ("internal", "disabled"):
        return None
    return jsonify({"error": "Forbidden", "message": "Internal access required"}), 403
