"""Unit tests for Entra employee email-local normalization / expected address."""

from app.auth.email_identity import expected_entra_email, normalize_email_local
from app.auth.employee_lookup import (
    is_admin_account,
    is_admin_email,
    parse_admin_emails,
    unmapped_account_info,
)


def test_normalize_umlauts_and_spaces():
    assert normalize_email_local("Jürgen") == "juergen"
    assert normalize_email_local("Müller") == "mueller"
    assert normalize_email_local("Weiß") == "weiss"
    assert normalize_email_local("Anna Maria") == "annamaria"
    assert normalize_email_local("Hans-Peter") == "hans-peter"


def test_expected_entra_email():
    assert (
        expected_entra_email("Max", "Mustermann", "sapv-oberberg.de")
        == "max.mustermann@sapv-oberberg.de"
    )
    assert (
        expected_entra_email("Jürgen", "Müller", "sapv-oberberg.de")
        == "juergen.mueller@sapv-oberberg.de"
    )
    assert expected_entra_email("", "Mustermann", "sapv-oberberg.de") is None


def test_parse_admin_emails():
    assert parse_admin_emails(None) == set()
    assert parse_admin_emails("") == set()
    assert parse_admin_emails("admin@example.de") == {"admin@example.de"}
    assert parse_admin_emails("A@x.de, b@x.de;C@x.de") == {"a@x.de", "b@x.de", "c@x.de"}
    assert parse_admin_emails('"Admin@Example.de"') == {"admin@example.de"}
    assert parse_admin_emails("'a@x.de, b@x.de'") == {"a@x.de", "b@x.de"}


def test_is_admin_email():
    allowlist = parse_admin_emails("admin@example.de, dispo@example.de")
    assert is_admin_email("admin@example.de", allowlist)
    assert is_admin_email("Admin@Example.de", allowlist)
    assert not is_admin_email("other@example.de", allowlist)
    assert not is_admin_email(None, allowlist)
    assert not is_admin_email("admin@example.de", set())


def test_is_admin_account_matches_preferred_username_case_insensitive():
    allowlist = parse_admin_emails("Admin@Example.de")
    assert is_admin_account({"preferred_username": "ADMIN@example.de"}, allowlist)
    assert is_admin_account({"emails": ["admin@example.de"]}, allowlist)
    assert not is_admin_account({"oid": "abc"}, allowlist)


def test_unmapped_account_info_with_email_and_oid():
    info = unmapped_account_info(
        {
            "oid": "11111111-2222-3333-4444-555555555555",
            "email": "max.mustermann@sapv-oberberg.de",
            "name": "Max Mustermann",
        },
        entra_email_domain="sapv-oberberg.de",
    )
    assert info["code"] == "employee_not_mapped"
    assert info["email"] == "max.mustermann@sapv-oberberg.de"
    assert info["oid"] == "11111111-2222-3333-4444-555555555555"
    assert info["name"] == "Max Mustermann"
    assert "vorname.nachname@sapv-oberberg.de" in info["detail"]
    assert "Entra-OID" in info["detail"]


def test_unmapped_account_info_missing_email():
    info = unmapped_account_info(
        {"oid": "abc-oid"},
        entra_email_domain="sapv-oberberg.de",
        admin_emails="admin@example.de",
    )
    assert info["email"] is None
    assert "keine E-Mail" in info["detail"]
    assert info["admin_allowlist_configured"] is True
    assert "keine E-Mail enthalten" in info["admin_detail"]


def test_unmapped_account_info_admin_list_empty():
    info = unmapped_account_info(
        {"email": "admin@example.de", "oid": "abc"},
        entra_email_domain="sapv-oberberg.de",
        admin_emails="",
    )
    assert info["admin_allowlist_configured"] is False
    assert "nicht gesetzt" in info["admin_detail"]
