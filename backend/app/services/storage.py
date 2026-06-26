"""Supabase Storage helpers (KVKK §4.5).

CV files live in a private bucket. We only ever hand out short-lived signed URLs
(default 120s) — never public URLs. Upload paths are namespaced per user as
``<user_id>/<filename>`` so the storage RLS policy (first folder == auth.uid())
applies.
"""
from __future__ import annotations

from supabase import Client

from ..config import get_settings


def user_object_path(user_id: str, filename: str) -> str:
    return f"{user_id}/{filename}"


def upload_cv(client: Client, user_id: str, filename: str, data: bytes) -> str:
    settings = get_settings()
    path = user_object_path(user_id, filename)
    client.storage.from_(settings.cv_bucket).upload(
        path,
        data,
        {"content-type": "application/pdf", "upsert": "true"},
    )
    return path


def create_signed_url(client: Client, storage_path: str) -> str:
    settings = get_settings()
    result = client.storage.from_(settings.cv_bucket).create_signed_url(
        storage_path, settings.signed_url_ttl_seconds
    )
    return result.get("signedURL") or result.get("signedUrl", "")
