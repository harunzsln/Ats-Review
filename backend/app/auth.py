"""Supabase JWT verification dependency.

The frontend authenticates with Supabase Auth and sends the access token as a
Bearer header. We verify it and expose the authenticated user id plus the raw
token (so we can build an RLS-scoped client).

Supabase supports two signing schemes:

* **Legacy HS256** — symmetric, verified with the project's JWT secret.
* **Asymmetric (ES256 / RS256)** — the default for newer projects, verified
  against the project's public JWKS endpoint
  (``<SUPABASE_URL>/auth/v1/.well-known/jwks.json``).

We auto-detect the algorithm from the token header and verify accordingly, so
the backend works regardless of which scheme the project uses.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from .config import Settings, get_settings


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None
    token: str


@lru_cache
def _jwk_client(jwks_url: str) -> PyJWKClient:
    # Cached so we don't refetch keys on every request.
    return PyJWKClient(jwks_url)


def _decode_token(token: str, settings: Settings) -> dict:
    header = jwt.get_unverified_header(token)
    alg = header.get("alg", "")

    common = {
        "audience": "authenticated",
        "options": {"verify_aud": True},
    }

    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_JWT_SECRET not configured for HS256 tokens.",
            )
        return jwt.decode(
            token, settings.supabase_jwt_secret, algorithms=["HS256"], **common
        )

    if alg in ("ES256", "RS256"):
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        signing_key = _jwk_client(jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(token, signing_key.key, algorithms=[alg], **common)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Unsupported token algorithm: {alg}",
    )


def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = _decode_token(token, settings)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )

    return CurrentUser(id=user_id, email=payload.get("email"), token=token)
