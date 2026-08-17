"""Validate Azure Entra ID access tokens via JWKS."""

from __future__ import annotations

import threading
from typing import Any

import jwt
from jwt import PyJWKClient

_jwks_clients: dict[str, PyJWKClient] = {}
_jwks_lock = threading.Lock()


def _jwks_client(tenant_id: str) -> PyJWKClient:
    with _jwks_lock:
        client = _jwks_clients.get(tenant_id)
        if client is None:
            url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
            client = PyJWKClient(url, cache_keys=True, lifespan=3600)
            _jwks_clients[tenant_id] = client
        return client


def validate_azure_token(token: str, tenant_id: str, client_id: str) -> dict[str, Any]:
    """
    Validate signature and standard claims.
    Accepts audience = client_id or api://client_id (common Entra SPA setups).
    """
    if not tenant_id or not client_id:
        raise ValueError("AZURE_TENANT_ID and AZURE_CLIENT_ID must be configured")

    jwks = _jwks_client(tenant_id)
    signing_key = jwks.get_signing_key_from_jwt(token)

    issuer_v2 = f"https://login.microsoftonline.com/{tenant_id}/v2.0"
    issuer_v1 = f"https://sts.windows.net/{tenant_id}/"

    audiences = [client_id, f"api://{client_id}"]

    try:
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audiences,
            issuer=[issuer_v2, issuer_v1],
            options={"require": ["exp", "iss", "aud"]},
        )
    except jwt.InvalidIssuerError:
        # Some tenants only issue one issuer form; retry without issuer check after manual verify
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audiences,
            options={"require": ["exp", "aud"], "verify_iss": False},
        )
        iss = claims.get("iss", "")
        if tenant_id not in iss:
            raise jwt.InvalidIssuerError(f"Unexpected issuer: {iss}") from None

    return claims
