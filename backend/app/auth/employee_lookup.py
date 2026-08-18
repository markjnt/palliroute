"""Resolve Employee from Entra JWT claims."""

from __future__ import annotations

from flask import current_app

from app.models.employee import Employee

from .email_identity import expected_entra_email


def _normalize_email(value: str) -> str:
    return value.strip().strip("'\"").strip().lower()


def _claim_email_values(claims: dict) -> list[str]:
    raw: list[str] = []
    for key in ("email", "preferred_username", "upn", "unique_name"):
        val = claims.get(key)
        if isinstance(val, str):
            raw.append(val)
        elif isinstance(val, list):
            raw.extend(item for item in val if isinstance(item, str))
    emails_claim = claims.get("emails")
    if isinstance(emails_claim, list):
        raw.extend(item for item in emails_claim if isinstance(item, str))

    seen: set[str] = set()
    out: list[str] = []
    for item in raw:
        if "@" not in item:
            continue
        normalized = _normalize_email(item)
        if normalized and normalized not in seen:
            seen.add(normalized)
            out.append(item.strip().strip("'\"").strip())
    return out


def _token_email(claims: dict) -> str | None:
    emails = _claim_email_values(claims)
    return emails[0] if emails else None


def parse_admin_emails(raw: str | None) -> set[str]:
    """Parse comma/semicolon-separated admin emails from env (case-insensitive)."""
    if not raw:
        return set()
    cleaned = raw.strip().strip("'\"").replace(";", ",").replace("\n", ",")
    return {part for part in (_normalize_email(item) for item in cleaned.split(",")) if part}


def is_admin_email(email: str | None, allowlist: set[str]) -> bool:
    if not email or not allowlist:
        return False
    return _normalize_email(email) in allowlist


def is_admin_account(claims: dict, allowlist: set[str]) -> bool:
    if not allowlist:
        return False
    return any(_normalize_email(email) in allowlist for email in _claim_email_values(claims))


def _claim_oid(claims: dict) -> str | None:
    oid = claims.get("oid") or claims.get("sub")
    if isinstance(oid, str):
        return oid.strip() or None
    return None


def unmapped_account_info(
    claims: dict, *, entra_email_domain: str, admin_emails: str | None = None
) -> dict:
    """Explain why an Entra account could not be mapped to an employee."""
    oid = _claim_oid(claims)
    token_emails = _claim_email_values(claims)
    email = token_emails[0] if token_emails else None
    name = claims.get("name") if isinstance(claims.get("name"), str) else None
    domain = (entra_email_domain or "").strip().lower() or "sapv-oberberg.de"
    pattern = f"vorname.nachname@{domain}"
    allowlist = parse_admin_emails(admin_emails)

    if not email and not oid:
        detail = (
            "Im Microsoft-Konto fehlen E-Mail und Entra-OID. "
            "Eine Zuordnung zu einem Mitarbeiter ist dadurch nicht möglich."
        )
    elif not email:
        detail = (
            "Die Entra-OID ist keinem Mitarbeiter zugeordnet, "
            "und im Microsoft-Konto ist keine E-Mail enthalten. "
            f"Ohne E-Mail kann auch das Namensmuster {pattern} nicht geprüft werden."
        )
    elif not oid:
        detail = (
            f"Die E-Mail {email} ist keinem Mitarbeiter zugeordnet "
            "(weder hinterlegte E-Mail noch Namensmuster "
            f"{pattern}). Im Token fehlt außerdem die Entra-OID."
        )
    else:
        detail = (
            f"Für dieses Microsoft-Konto ist kein Mitarbeiter hinterlegt. "
            f"Geprüft wurden Entra-OID, hinterlegte Mitarbeiter-E-Mail ({email}) "
            f"und das Namensmuster {pattern}."
        )

    if not allowlist:
        admin_detail = (
            "ADMIN_EMAILS ist leer oder nicht gesetzt; Admin-Zugang ist nicht konfiguriert."
        )
    elif not token_emails:
        admin_detail = (
            "Im Access-Token ist keine E-Mail enthalten, daher kann die Admin-Liste "
            "nicht geprüft werden."
        )
    else:
        shown = ", ".join(token_emails)
        admin_detail = f"Kein Treffer in der Admin-Liste. Abgeglichene Token-Mail(s): {shown}."

    return {
        "code": "employee_not_mapped",
        "detail": detail,
        "admin_detail": admin_detail,
        "email": email,
        "token_emails": token_emails,
        "oid": oid,
        "name": name.strip() if name else None,
        "entra_email_domain": domain,
        "name_email_pattern": pattern,
        "admin_allowlist_configured": bool(allowlist),
    }


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
    oid = _claim_oid(claims)
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
