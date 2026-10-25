import json
import re
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from .config import get_settings
from .schemas import ExtractedIncident, RCAAnalysis

FISHBONE_CATEGORIES = (
    "People",
    "Process",
    "Equipment",
    "Materials",
    "Measurement",
    "Environment",
)


class RCAState(TypedDict, total=False):
    incident_text: str
    extracted_fields: dict[str, Any]
    evidence: list[str]
    incident: dict[str, Any]
    analysis: dict[str, Any]
    error: str


def _client():
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Add it to backend/.env "
            "to enable AI analysis."
        )

    from langchain_groq import ChatGroq

    return ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=0,
        timeout=60,
        max_retries=3,
    )


def _json_response(message):
    """Parse JSON from a model response, including optional Markdown fences."""
    content = message.content if hasattr(message, "content") else str(message)

    if isinstance(content, list):
        content = "".join(
            str(item.get("text", ""))
            if isinstance(item, dict)
            else str(item)
            for item in content
        )

    content = str(content).strip()
    content = re.sub(r"^\s*```(?:json)?\s*", "", content, flags=re.I)
    content = re.sub(r"\s*```\s*$", "", content)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        # Some providers wrap JSON in a short preamble. Only attempt to
        # parse the first complete-looking object; validation still follows.
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("AI response did not contain a JSON object.")
        parsed = json.loads(content[start : end + 1])

    if not isinstance(parsed, dict):
        raise ValueError("AI response must be a JSON object.")

    return parsed


def _as_string(value, default=None):
    if value is None:
        return default
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned if cleaned else default
    if isinstance(value, (int, float)):
        return str(value)
    return default


def _as_string_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return [item.strip() for item in value if isinstance(item, str) and item.strip()]


def _first_text(*values):
    for value in values:
        result = _as_string(value)
        if result:
            return result
    return None


def _normalize_incident(data: dict[str, Any], incident_text: str,
                        extracted_fields: dict[str, Any]) -> dict[str, Any]:
    """Normalize common UI/API aliases before strict Pydantic validation."""
    if not isinstance(data, dict):
        raise ValueError("AI extraction did not return a JSON object.")

    data = dict(data)
    overrides = extracted_fields if isinstance(extracted_fields, dict) else {}

    # The UI and some clients use incident_title while the API schema uses title.
    title = _first_text(
        overrides.get("title"),
        overrides.get("incident_title"),
        data.get("title"),
        data.get("incident_title"),
    )
    if not title:
        title = "Incident requiring investigation"
    data["title"] = title

    aliases = {
        "incident_date": ("incident_date", "date"),
        "product": ("product", "product_or_batch"),
        "batch": ("batch", "batch_number"),
        "deviation_description": (
            "deviation_description",
            "deviation",
            "description",
        ),
        "impact": ("impact", "potential_impact"),
        "department": ("department", "area", "unit", "manufacturing_area"),
        "severity": ("severity", "criticality", "classification"),
        "immediate_containment": (
            "immediate_containment",
            "containment",
            "containment_actions",
            "immediate_action",
            "immediate_corrective_action",
        ),
    }

    for canonical, possible_keys in aliases.items():
        override_value = next(
            (overrides.get(key) for key in possible_keys
             if overrides.get(key) not in (None, "")),
            None,
        )
        model_value = next(
            (data.get(key) for key in possible_keys
             if data.get(key) not in (None, "")),
            None,
        )
        value = _first_text(override_value, model_value)
        data[canonical] = value

    # Normalize severity to one of Critical, Major, Minor; default to Major
    sev_raw = str(data.get("severity") or "").strip().lower()
    if "crit" in sev_raw:
        data["severity"] = "Critical"
    elif "min" in sev_raw:
        data["severity"] = "Minor"
    elif "maj" in sev_raw:
        data["severity"] = "Major"
    elif not data.get("severity"):
        data["severity"] = "Major"

    # A source narrative is valid input for a missing description, but it is
    # not treated as proof of a cause or impact.
    if not data.get("deviation_description"):
        data["deviation_description"] = incident_text.strip()

    for list_key in ("known_facts", "assumptions", "unknowns", "evidence_available", "evidence_missing"):
        override_value = overrides.get(list_key)
        model_value = data.get(list_key)
        if override_value not in (None, "", []):
            data[list_key] = _as_string_list(override_value)
        else:
            data[list_key] = _as_string_list(model_value)

    data["source_text"] = incident_text
    return data


def extract_node(state: RCAState):
    incident_text = state["incident_text"]
    overrides = state.get("extracted_fields") or {}
    llm = _client()

    prompt = (
        "Return ONLY a valid JSON object with keys: title, incident_date, "
        "product, batch, department, severity (Critical, Major, or Minor), "
        "immediate_containment, deviation_description, impact, known_facts, "
        "assumptions, unknowns, evidence_available, evidence_missing. "
        "The title MUST be a non-empty string. "
        "If no explicit title is supplied, create a short neutral title "
        "based only on the supplied incident text. Never return null for title. "
        "Use null for missing optional scalar fields and [] for missing lists. "
        "Extract only explicit information; do not invent dates, products, "
        "batches, causes, impacts, measurements, or evidence. Separate known "
        "facts from assumptions and unknowns.\n\nINCIDENT TEXT:\n"
        + incident_text[:50000]
    )

    data = _json_response(llm.invoke(prompt))
    normalized = _normalize_incident(data, incident_text, overrides)
    return {"incident": ExtractedIncident.model_validate(normalized).model_dump()}


def _normalize_analysis_lists(raw: dict[str, Any]) -> dict[str, Any]:
    """Keep only structurally usable model items; never invent findings."""
    normalized: dict[str, Any] = {}

    whys = []
    for item in raw.get("five_whys", []) if isinstance(raw.get("five_whys"), list) else []:
        if not isinstance(item, dict):
            continue
        question = _as_string(item.get("question"))
        answer = _as_string(item.get("answer"))
        try:
            why_number = int(item.get("why"))
        except (TypeError, ValueError):
            continue
        if not question or not answer or not 1 <= why_number <= 5:
            continue
        whys.append({
            "why": why_number,
            "question": question,
            "answer": answer,
            "evidence_refs": _as_string_list(item.get("evidence_refs")),
        })
    normalized["five_whys"] = whys

    hypotheses = []
    for index, item in enumerate(
        raw.get("hypotheses", []) if isinstance(raw.get("hypotheses"), list) else [],
        start=1,
    ):
        if not isinstance(item, dict):
            continue
        statement = _as_string(item.get("statement"))
        rationale = _as_string(item.get("rationale"))
        if not statement or not rationale:
            continue
        hypotheses.append({
            "id": _as_string(item.get("id"), f"H{index}"),
            "statement": statement,
            "rationale": rationale,
            "supporting_evidence": _as_string_list(item.get("supporting_evidence")),
            "contradicting_evidence": _as_string_list(item.get("contradicting_evidence")),
            "evidence_needed": _as_string_list(item.get("evidence_needed")),
            "status": _as_string(item.get("status"), "Unverified hypothesis"),
        })
    normalized["hypotheses"] = hypotheses

    factors = []
    for item in (
        raw.get("contributing_factors", [])
        if isinstance(raw.get("contributing_factors"), list) else []
    ):
        if not isinstance(item, dict):
            continue
        factor = _as_string(item.get("factor"))
        if not factor:
            continue
        factors.append({
            "factor": factor,
            "evidence_refs": _as_string_list(item.get("evidence_refs")),
            "status": _as_string(item.get("status"), "Unverified hypothesis"),
        })
    normalized["contributing_factors"] = factors

    capas = []
    for item in raw.get("capas", []) if isinstance(raw.get("capas"), list) else []:
        if not isinstance(item, dict):
            continue
        action = _as_string(item.get("action"))
        rationale = _as_string(item.get("rationale"))
        if not action or not rationale:
            continue
        capas.append({
            "action": action,
            "type": _as_string(item.get("type"), "Corrective"),
            "rationale": rationale,
            "priority": _as_string(item.get("priority"), "Medium"),
            "verification": _as_string_list(item.get("verification")),
        })
    normalized["capas"] = capas

    normalized["evidence_gaps"] = _as_string_list(raw.get("evidence_gaps"))
    return normalized


def analysis_node(state: RCAState):
    llm = _client()
    prompt = """You are assisting a pharmaceutical quality investigator conducting a GxP Root Cause Analysis.
Return ONLY a valid JSON object matching this structure:
{
  "problem_statement": "Concise factual statement of the observed deviation problem",
  "five_whys": [
    {"why": 1, "question": "Why did the immediate deviation occur?", "answer": "...", "evidence_refs": []},
    {"why": 2, "question": "Why did that immediate condition occur?", "answer": "...", "evidence_refs": []},
    {"why": 3, "question": "Why did that secondary condition occur?", "answer": "...", "evidence_refs": []},
    {"why": 4, "question": "Why did that underlying condition occur?", "answer": "...", "evidence_refs": []},
    {"why": 5, "question": "Why did the system, process, or barrier allow this to occur?", "answer": "...", "evidence_refs": []}
  ],
  "fishbone": {
    "People": ["Observations regarding operators, qualification, shift handover"],
    "Process": ["Observations regarding SOPs, sequence, line clearance"],
    "Equipment": ["Observations regarding machinery, sensors, calibration, tooling"],
    "Materials": ["Observations regarding batches, components, labels, consumables"],
    "Measurement": ["Observations regarding inspection, testing, sensors, tolerances"],
    "Environment": ["Observations regarding line area, storage, lighting, contamination"]
  },
  "hypotheses": [
    {
      "id": "H1", "statement": "Plausible root cause hypothesis statement", "rationale": "Mechanism explaining how this cause produced the deviation",
      "supporting_evidence": [], "contradicting_evidence": [],
      "evidence_needed": ["Specific record or test required to confirm or refute"], "status": "Unverified hypothesis"
    }
  ],
  "contributing_factors": [
    {"factor": "Specific condition or contributing factor", "evidence_refs": [], "status": "Observed factor"}
  ],
  "evidence_gaps": ["Critical document, record, or test result missing from the investigation register"],
  "capas": [
    {
      "action": "Clear, actionable remediation or prevention step",
      "type": "Corrective",
      "rationale": "How this action eliminates the root cause or prevents recurrence",
      "priority": "High",
      "verification": ["Specific verification method or effectiveness criteria"]
    }
  ]
}

Safety and evidence rules:
- Do not claim a root cause is confirmed unless the supplied evidence explicitly confirms it.
- If evidence is insufficient, state that clearly and offer testable, plausible hypotheses.
- Do not invent evidence, evidence references, measurements, test results, or regulatory citations.
- Evidence references may only refer to the supplied incident facts and evidence.
- Fishbone entries are investigation avenues, not established facts.
- CAPAs are suggestions for qualified review, not approved actions or compliance guarantees.
- Always provide preliminary corrective and preventive CAPA suggestions directly addressing the deviation and evidence gaps.
- Return empty arrays where there is no supportable content. Each five-whys answer must distinguish facts from uncertainty.
- Keep recommendations proportionate, specific, and verifiable.

STRUCTURED INCIDENT:
"""
    prompt += json.dumps(state["incident"], ensure_ascii=False)
    prompt += "\nSUPPLIED EVIDENCE:\n"
    prompt += json.dumps(state.get("evidence", []), ensure_ascii=False)

    raw = _json_response(llm.invoke(prompt))
    if not isinstance(raw, dict):
        raise ValueError("AI analysis did not return a JSON object.")

    raw["incident"] = state["incident"]
    raw["problem_statement"] = _as_string(raw.get("problem_statement")) or state["incident"].get("deviation_description", "")
    raw["review_required"] = True
    raw["review_notice"] = (
        "AI-generated suggestions only; qualified human review is required "
        "before finalization."
    )

    # Keep the fishbone shape stable for the frontend and discard malformed
    # model items rather than inventing missing facts to satisfy the schema.
    fishbone = raw.get("fishbone")
    if not isinstance(fishbone, dict):
        fishbone = {}
    
    raw["fishbone"] = {
        category: _as_string_list(
            fishbone.get(category)
            or (fishbone.get("Process") or fishbone.get("Method") if category in ("Process", "Method") else None)
            or (fishbone.get("Equipment") or fishbone.get("Machine") if category in ("Equipment", "Machine") else None)
            or (fishbone.get("Materials") or fishbone.get("Material") if category in ("Materials", "Material") else None)
        )
        for category in FISHBONE_CATEGORIES
    }
    raw.update(_normalize_analysis_lists(raw))

    normalized = RCAAnalysis.model_validate(raw)
    return {"analysis": normalized.model_dump()}


def build_graph():
    graph = StateGraph(RCAState)
    graph.add_node("extract_incident", extract_node)
    graph.add_node("analyze_root_cause", analysis_node)
    graph.set_entry_point("extract_incident")
    graph.add_edge("extract_incident", "analyze_root_cause")
    graph.add_edge("analyze_root_cause", END)
    return graph.compile()


workflow = build_graph()


def run_rca(incident_text: str, extracted_fields=None, evidence=None):
    result = workflow.invoke(
        {
            "incident_text": incident_text,
            "extracted_fields": extracted_fields or {},
            "evidence": evidence or [],
        }
    )
    if "analysis" not in result:
        raise ValueError("RCA workflow completed without an analysis result.")
    return RCAAnalysis.model_validate(result["analysis"]).model_dump()
