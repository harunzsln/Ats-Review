"""Supabase client factories.

Two flavours:

* ``get_user_client`` — a per-request client that carries the end user's access
  token, so all queries run under that user's identity and **RLS is enforced**.
  This is what every CRUD router uses.

* ``get_admin_client`` — a service-role client that bypasses RLS. It is used
  ONLY for privileged operations that legitimately need it (account hard delete,
  which must remove the auth.users row). Never expose this to clients.
"""
from __future__ import annotations

from fastapi import Depends
from supabase import Client, create_client

from .auth import CurrentUser, get_current_user
from .config import Settings, get_settings


def _sdk_api_key(settings: Settings) -> str:
    """Key passed to ``create_client`` for SDK initialization.

    New Supabase projects ship a browser ``sb_publishable_*`` key. ``supabase-py``
    still requires a JWT-shaped anon or service key at init time. Per-request
    Per-request RLS is enforced by attaching the end-user JWT via ``postgrest.auth()``.
    """
    anon = settings.supabase_anon_key.strip()
    if anon.startswith("eyJ"):
        return anon
    service = settings.supabase_service_role_key.strip()
    if service.startswith("eyJ"):
        return service
    raise ValueError(
        "SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY must be a JWT (eyJ…). "
        "sb_publishable_* keys work in the browser only; copy the service_role "
        "or legacy anon JWT from Supabase Dashboard → Settings → API."
    )


def get_user_client(
    user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> Client:
    client = create_client(settings.supabase_url, _sdk_api_key(settings))
    # Attach the user's JWT so PostgREST/Storage see auth.uid() == user.id.
    client.postgrest.auth(user.token)
    client.storage._client.headers["Authorization"] = f"Bearer {user.token}"
    return client


def get_admin_client(settings: Settings = Depends(get_settings)) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
