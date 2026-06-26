"""Interview simulation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..auth import CurrentUser
from ..dependencies import require_consent
from ..models.schemas import (
    InterviewResponseSubmit,
    InterviewSimulation,
    InterviewSimulationCreate,
)
from ..services import gemini
from ..services.pii_filter import filter_for_ai
from ..supabase_client import get_user_client

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("", response_model=InterviewSimulation, status_code=201)
def create_simulation(
    payload: InterviewSimulationCreate,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> InterviewSimulation:
    app_res = (
        client.table("applications")
        .select("*, job_postings(*)")
        .eq("id", payload.application_id)
        .execute()
    )
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Application not found")
    posting = app_res.data[0].get("job_postings") or {}

    cv_res = (
        client.table("cv_base")
        .select("parsed_content")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    cv_content = cv_res.data[0]["parsed_content"] if cv_res.data else {}

    # KVKK §4.4: sanitize before the cross-border AI call.
    sanitized = filter_for_ai(cv_content)
    generated = gemini.generate_interview_questions(sanitized, posting)

    record = {
        "user_id": user.id,
        "application_id": payload.application_id,
        "weak_points_identified": generated["weak_points"],
        "simulated_questions": generated["questions"],
        "user_responses": [],
    }
    res = client.table("interview_simulations").insert(record).execute()
    return InterviewSimulation(**res.data[0])


@router.get("", response_model=list[InterviewSimulation])
def list_simulations(
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> list[InterviewSimulation]:
    res = (
        client.table("interview_simulations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return [InterviewSimulation(**row) for row in res.data]


@router.get("/{simulation_id}", response_model=InterviewSimulation)
def get_simulation(
    simulation_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> InterviewSimulation:
    res = (
        client.table("interview_simulations")
        .select("*")
        .eq("id", simulation_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return InterviewSimulation(**res.data[0])


@router.post("/{simulation_id}/responses", response_model=InterviewSimulation)
def submit_responses(
    simulation_id: str,
    payload: InterviewResponseSubmit,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> InterviewSimulation:
    res = (
        client.table("interview_simulations")
        .update({"user_responses": payload.user_responses})
        .eq("id", simulation_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return InterviewSimulation(**res.data[0])


@router.delete("/{simulation_id}", status_code=204, response_model=None)
def delete_simulation(
    simulation_id: str,
    user: CurrentUser = Depends(require_consent),
    client: Client = Depends(get_user_client),
) -> None:
    client.table("interview_simulations").delete().eq("id", simulation_id).execute()
