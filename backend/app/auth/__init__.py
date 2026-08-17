"""Flask auth: Entra JWT validation + Internal API key."""

# Submodules are imported by callers directly to avoid heavy eager deps
# (PyJWT) when only helpers like email_identity are needed.
from .decorators import require_auth, require_internal

__all__ = [
    "require_auth",
    "require_internal",
]
