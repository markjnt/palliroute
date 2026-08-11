"""Resolve Employee from Entra JWT claims."""

from __future__ import annotations

from flask import current_app

from app.models.employee import Employee

from .email_identity import expected_entra_email


def _token_email(claims: dict) -> str | None:
    email = (
        claims.get("email")
        or claims.get("preferred_username")
        or claims.get("upn")
        or claims.get("unique_name")
    )
    if email and isinstance(email, str) and "@" in email:
        return email.strip()
    return None


def _soft_bind(employee: Employee, *, oid: str | None, email: str | None) -> None:
    """Fill empty email / entra_oid from token; does not overwrite set values."""
    changed = False
    if oid and not employee.entra_oid:
        employee.entra_oid = oid
        changed = True
    if email and not employee.email:
        employee.email = email
        changed = True
    if changed:
        from app import db

        db.session.commit()


def _find_by_name_email_pattern(token_email: str, domain: str) -> Employee | None:
    """Match token email to vorname.nachname@domain derived from employee names."""
    token_norm = token_email.strip().lower()
    matches: list[Employee] = []
    for employee in Employee.query.all():
        expected = expected_entra_email(employee.first_name, employee.last_name, domain)
        if expected and expected == token_norm:
            matches.append(employee)

    if len(matches) != 1:
        return None

    employee = matches[0]
    # Do not steal a row already bound to a different account
    if employee.email and employee.email.strip().lower() != token_norm:
        return None
    return employee


def find_employee_for_claims(claims: dict) -> Employee | None:
    oid = claims.get("oid") or claims.get("sub")
    if isinstance(oid, str):
        oid = oid.strip() or None
    else:
        oid = None

    email = _token_email(claims)

    if oid:
        employee = Employee.query.filter_by(entra_oid=oid).first()
        if employee:
            _soft_bind(employee, oid=oid, email=email)
            return employee

    if email:
        employee = Employee.query.filter(Employee.email.ilike(email)).first()
        if employee:
            _soft_bind(employee, oid=oid, email=email)
            return employee

        domain = current_app.config.get("ENTRA_EMAIL_DOMAIN") or "sapv-oberberg.de"
        employee = _find_by_name_email_pattern(email, domain)
        if employee:
            _soft_bind(employee, oid=oid, email=email)
            return employee

    return None
