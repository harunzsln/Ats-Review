"""Application configuration loaded from environment variables."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = "http://localhost:54321"
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    cv_bucket: str = "cv-files"
    signed_url_ttl_seconds: int = 120

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    kvkk_disclosure_version: str = "2026-01-01"

    frontend_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
