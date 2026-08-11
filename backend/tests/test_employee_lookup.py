"""Unit tests for Entra employee email-local normalization / expected address."""

from app.auth.email_identity import expected_entra_email, normalize_email_local


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
