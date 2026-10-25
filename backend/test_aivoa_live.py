"""Live AIVOA smoke test. Run from the backend folder with its .env and venv active.
Calls the real configured Groq model and the running FastAPI service.
Never prints the API key. Creates one clearly labelled test investigation.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
import httpx

BASE_URL = "http://127.0.0.1:8000"

INCIDENT = (
    "On 18 October 2026, the quality team observed delayed dispatch of several orders. "
    "Operations reported an increased processing queue during the previous shift. "
    "The confirmed cause, number of affected orders, system logs, staffing levels, "
    "and responsible process step are not yet known."
)
EVIDENCE = [
    "Initial quality team incident description",
    "Operations team report of an increased processing queue",
]


def show(name: str, ok: bool, detail: str = "") -> None:
    print(f"{'PASS' if ok else 'FAIL'} | {name}" + (f" | {detail}" if detail else ""))


def main() -> int:
    failures = 0
    try:
        from app.config import get_settings
        from langchain_groq import ChatGroq
        settings = get_settings()
    except Exception as exc:
        show("Load app settings / Groq dependency", False, f"{type(exc).__name__}: {exc}")
        return 2

    if not settings.groq_api_key:
        show("GROQ_API_KEY loaded from backend/.env", False, "Key missing; not printing or requesting the key here")
        return 2
    show("GROQ_API_KEY loaded from backend/.env", True, f"model={settings.groq_model}")

    # Direct provider smoke test, independent of FastAPI.
    try:
        llm = ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0,
            timeout=30,
            max_retries=0,
        )
        answer = llm.invoke('Reply with exactly: GROQ_LIVE_OK')
        content = getattr(answer, "content", str(answer))
        ok = bool(str(content).strip())
        show("Direct Groq chat completion", ok, f"non-empty response; response_chars={len(str(content))}")
        if not ok:
            failures += 1
    except Exception as exc:
        show("Direct Groq chat completion", False, f"{type(exc).__name__}: {exc}")
        failures += 1
        print("Stop here if the provider test failed; endpoint AI tests will likely fail too.")
        return 1

    try:
        with httpx.Client(base_url=BASE_URL, timeout=150.0) as client:
            # Health/database
            r = client.get("/health")
            health = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
            ok = r.status_code == 200 and health.get("database") == "ok" and health.get("groq_configured") is True
            show("GET /health", ok, f"HTTP {r.status_code}; {json.dumps(health)}")
            failures += not ok

            # Negative validation checks (must not call Groq).
            r = client.post("/api/rca/extract", data={"text": " "})
            ok = r.status_code == 422
            show("POST /api/rca/extract rejects empty input", ok, f"HTTP {r.status_code}")
            failures += not ok

            r = client.post("/api/rca/analyze", json={"incident_text": "short"})
            ok = r.status_code == 422
            show("POST /api/rca/analyze rejects short input", ok, f"HTTP {r.status_code}")
            failures += not ok

            r = client.get("/api/investigations/999999999")
            ok = r.status_code == 404
            show("GET /api/investigations/{missing_id} returns 404", ok, f"HTTP {r.status_code}")
            failures += not ok

            # Real extraction endpoint: multipart text field.
            r = client.post("/api/rca/extract", data={"text": INCIDENT})
            try:
                extracted = r.json()
            except Exception:
                extracted = {"body": r.text[:500]}
            ok = r.status_code == 200 and isinstance(extracted, dict) and bool(extracted.get("title")) and bool(extracted.get("deviation_description"))
            show("POST /api/rca/extract (real Groq)", ok, f"HTTP {r.status_code}; title={extracted.get('title')!r}; detail={extracted.get('detail', '')!r}")
            failures += not ok

            # Real LangGraph + Groq analysis endpoint.
            analysis_payload = {
                "incident_text": INCIDENT,
                "extracted_fields": {
                    "incident_title": "Delayed customer order dispatch",
                    "deviation_description": "Several orders were dispatched later than expected.",
                    "known_facts": [
                        "The quality team identified delayed dispatch.",
                        "Operations reported an increased queue during the previous shift.",
                    ],
                    "unknowns": ["Exact cause", "Affected order count", "System logs", "Staffing levels"],
                },
                "evidence": EVIDENCE,
            }
            r = client.post("/api/rca/analyze", json=analysis_payload)
            try:
                analysis = r.json()
            except Exception:
                analysis = {"body": r.text[:1000]}
            required = ["incident", "five_whys", "fishbone", "hypotheses", "evidence_gaps", "capas", "review_required"]
            missing = [k for k in required if k not in analysis]
            ok = r.status_code == 200 and not missing and analysis.get("review_required") is True
            show("POST /api/rca/analyze (real LangGraph + Groq)", ok, f"HTTP {r.status_code}; missing_keys={missing}; detail={analysis.get('detail', '')!r}")
            if r.status_code == 200:
                print("  RCA shape:", json.dumps({
                    "five_whys_count": len(analysis.get("five_whys", [])),
                    "hypotheses_count": len(analysis.get("hypotheses", [])),
                    "evidence_gaps_count": len(analysis.get("evidence_gaps", [])),
                    "capas_count": len(analysis.get("capas", [])),
                    "review_required": analysis.get("review_required"),
                }))
            failures += not ok

            # Investigation CRUD. Keep a labelled test record to make persistence verifiable.
            payload = {
                "title": "[LIVE TEST] AIVOA API smoke test",
                "original_text": INCIDENT,
                "source_metadata": {"source_type": "live-smoke-test"},
                "extracted_fields": extracted if isinstance(extracted, dict) and "title" in extracted else {},
                "analysis": analysis if isinstance(analysis, dict) and "incident" in analysis else {},
                "human_findings": {"note": "Automated test record; not a real quality investigation."},
                "review_status": "Pending qualified review",
            }
            r_create = client.post("/api/investigations", json=payload)
            try:
                created = r_create.json()
            except Exception:
                created = {}
            inv_id = created.get("id")
            ok = r_create.status_code == 201 and isinstance(inv_id, int)
            show("POST /api/investigations", ok, f"HTTP {r_create.status_code}; id={inv_id}; detail={created.get('detail', '')!r}")
            failures += not ok

            if ok:
                r_list = client.get("/api/investigations?limit=50&offset=0")
                try:
                    items = r_list.json()
                except Exception:
                    items = []
                list_ok = r_list.status_code == 200 and isinstance(items, list) and any(x.get("id") == inv_id for x in items)
                show("GET /api/investigations", list_ok, f"HTTP {r_list.status_code}; test_record_found={list_ok}")
                failures += not list_ok

                r_get = client.get(f"/api/investigations/{inv_id}")
                try:
                    one = r_get.json()
                except Exception:
                    one = {}
                get_ok = r_get.status_code == 200 and one.get("id") == inv_id
                show(f"GET /api/investigations/{inv_id}", get_ok, f"HTTP {r_get.status_code}")
                failures += not get_ok

                update_payload = {**payload, "title": "[LIVE TEST] AIVOA API smoke test (updated)"}
                r_update = client.put(f"/api/investigations/{inv_id}", json=update_payload)
                try:
                    updated = r_update.json()
                except Exception:
                    updated = {}
                update_ok = r_update.status_code == 200 and updated.get("title") == update_payload["title"]
                show(f"PUT /api/investigations/{inv_id}", update_ok, f"HTTP {r_update.status_code}; title={updated.get('title')!r}")
                failures += not update_ok

                r_verify = client.get(f"/api/investigations/{inv_id}")
                try:
                    verified = r_verify.json()
                except Exception:
                    verified = {}
                persist_ok = r_verify.status_code == 200 and verified.get("title") == update_payload["title"]
                show("Verify updated record persists after reload", persist_ok, f"HTTP {r_verify.status_code}")
                failures += not persist_ok

            # Optional PDF endpoint test: pass a path as first CLI argument.
            if len(sys.argv) > 1:
                pdf_path = Path(sys.argv[1])
                if not pdf_path.is_file():
                    show("POST /api/rca/extract (PDF)", False, f"File not found: {pdf_path}")
                    failures += 1
                else:
                    with pdf_path.open("rb") as f:
                        pr = client.post("/api/rca/extract", files={"file": (pdf_path.name, f, "application/pdf")})
                    try:
                        pdf_data = pr.json()
                    except Exception:
                        pdf_data = {}
                    pdf_ok = pr.status_code == 200 and bool(pdf_data.get("title"))
                    show("POST /api/rca/extract (PDF + real Groq)", pdf_ok, f"HTTP {pr.status_code}; title={pdf_data.get('title')!r}; detail={pdf_data.get('detail', '')!r}")
                    failures += not pdf_ok
            else:
                print("SKIP | PDF extraction | optional: pass a text-based PDF path as an argument")

    except httpx.ConnectError:
        show("Connect to FastAPI", False, f"Cannot reach {BASE_URL}; start uvicorn first")
        return 2
    except Exception as exc:
        show("Endpoint test runner", False, f"{type(exc).__name__}: {exc}")
        return 2

    print("\nSUMMARY:", "ALL CHECKED TESTS PASSED" if failures == 0 else f"{failures} CHECK(S) FAILED")
    print("Note: PDF extraction is only included if a PDF path was supplied. This script does not test a browser UI click-through.")
    return 0 if failures == 0 else 1

if __name__ == "__main__":
    raise SystemExit(main())
