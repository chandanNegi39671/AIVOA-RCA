from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, ConfigDict

class ExtractedIncident(BaseModel):
    title: str = "Incident requires title"
    incident_date: str | None = None
    product: str | None = None
    batch: str | None = None
    department: str | None = None
    severity: str | None = "Major"
    immediate_containment: str | None = None
    deviation_description: str
    impact: str | None = None
    known_facts: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    unknowns: list[str] = Field(default_factory=list)
    evidence_available: list[str] = Field(default_factory=list)
    evidence_missing: list[str] = Field(default_factory=list)
    source_text: str = ""

class WhyItem(BaseModel):
    why: int = Field(ge=1, le=5)
    question: str
    answer: str
    evidence_refs: list[str] = Field(default_factory=list)

class Hypothesis(BaseModel):
    id: str
    statement: str
    rationale: str
    supporting_evidence: list[str] = Field(default_factory=list)
    contradicting_evidence: list[str] = Field(default_factory=list)
    evidence_needed: list[str] = Field(default_factory=list)
    status: str = "Unverified hypothesis"

class Capa(BaseModel):
    action: str
    type: str = "Corrective"
    rationale: str
    priority: str = "Medium"
    verification: list[str] = Field(default_factory=list)

class RCAAnalysis(BaseModel):
    incident: ExtractedIncident
    problem_statement: str | None = None
    five_whys: list[WhyItem] = Field(default_factory=list)
    fishbone: dict[str, list[str]] = Field(default_factory=dict)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    contributing_factors: list[dict[str, Any]] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    capas: list[Capa] = Field(default_factory=list)
    review_required: bool = True
    review_notice: str = "AI-generated suggestions only; qualified human review is required before finalization."

class AnalyzeRequest(BaseModel):
    incident_text: str = Field(min_length=10, max_length=50000)
    extracted_fields: dict[str, Any] = Field(default_factory=dict)
    evidence: list[str] = Field(default_factory=list)

class InvestigationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    original_text: str = ""
    source_metadata: dict[str, Any] = Field(default_factory=dict)
    extracted_fields: dict[str, Any] = Field(default_factory=dict)
    analysis: dict[str, Any] = Field(default_factory=dict)
    human_findings: dict[str, Any] = Field(default_factory=dict)
    review_status: str = "Pending qualified review"

class InvestigationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    review_status: str
    original_text: str
    source_metadata: dict[str, Any]
    extracted_fields: dict[str, Any]
    analysis: dict[str, Any]
    human_findings: dict[str, Any]
    created_at: datetime
    updated_at: datetime
