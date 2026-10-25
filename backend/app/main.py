
import io
import logging
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, text
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from .config import get_settings
from .database import Base, engine, get_db
from .models import Investigation
from .schemas import (
    AnalyzeRequest,
    ExtractedIncident,
    InvestigationCreate,
    InvestigationOut,
)
from .workflow import run_rca, _client, _json_response, _normalize_incident


# --------------------------------------------------
# Configuration and logging
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


# --------------------------------------------------
# Application lifecycle
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic should manage schema changes.
    # create_all is retained for local development.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AIVOA RCA Copilot API",
    version="1.0.0",
    description=(
        "AI-assisted root cause analysis. "
        "All findings require qualified human review."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        database_status = "ok"
    except Exception:
        logger.exception("Database health check failed")
        database_status = "unavailable"

    return {
        "status": "ok" if database_status == "ok" else "degraded",
        "database": database_status,
        "groq_configured": bool(settings.groq_api_key),
    }


# --------------------------------------------------
# Incident extraction from text or PDF
# --------------------------------------------------

@app.post("/api/rca/extract")
async def extract_incident(
    text_input: str = Form(default="", alias="text"),
    file: UploadFile | None = File(default=None),
):
    content = text_input.strip()

    metadata = {
        "source_type": "text",
        "filename": None,
    }

    if file is not None:
        filename = (file.filename or "").lower()

        if (
            not filename.endswith(".pdf")
            or file.content_type
            not in (
                "application/pdf",
                "application/octet-stream",
                None,
            )
        ):
            raise HTTPException(
                status_code=415,
                detail="Only PDF uploads are supported.",
            )

        max_bytes = settings.max_upload_mb * 1024 * 1024

        raw = await file.read(max_bytes + 1)

        if len(raw) == 0:
            raise HTTPException(
                status_code=422,
                detail="The uploaded PDF file is empty (0 bytes).",
            )

        if len(raw) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"PDF exceeds "
                    f"{settings.max_upload_mb} MB limit."
                ),
            )

        try:
            reader = PdfReader(
                io.BytesIO(raw),
                strict=False,
            )

            if reader.is_encrypted:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "Encrypted PDFs are not supported. "
                        "Provide an unencrypted PDF."
                    ),
                )

            if len(reader.pages) == 0:
                raise HTTPException(
                    status_code=422,
                    detail="The uploaded PDF has no pages.",
                )

            content_from_pdf = "\n".join(
                page.extract_text() or ""
                for page in reader.pages
            ).strip()

        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("PDF extraction failed")

            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not read this PDF. Check that it is "
                    "a valid, unencrypted PDF."
                ),
            ) from exc

        if not content_from_pdf:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No selectable text was found in this PDF. The document may be "
                    "scanned or image-only. Since OCR is not configured, please "
                    "paste the incident narrative manually or provide a digital PDF."
                ),
            )

        content = (
            f"{content}\n\n{content_from_pdf}".strip()
            if content
            else content_from_pdf
        )

        metadata = {
            "source_type": "pdf",
            "filename": file.filename,
        }

    if len(content) < 10:
        raise HTTPException(
            status_code=422,
            detail=(
                "Provide at least 10 characters of incident text "
                "or a readable PDF."
            ),
        )

    if not settings.groq_api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI extraction is unavailable: "
                "GROQ_API_KEY is not configured."
            ),
        )

    try:
        prompt = (
            "Return ONLY valid JSON with these keys: "
            "title, incident_date, product, batch, department, "
            "severity, immediate_containment, deviation_description, "
            "impact, known_facts, assumptions, unknowns, "
            "evidence_available, evidence_missing. "
            "Severity must be one of: Critical, Major, Minor. "
            "Extract only explicit information. Do not infer "
            "missing values. Use null for missing scalar values "
            "and [] for missing lists. Separate facts, "
            "assumptions, and unknowns.\n\n"
            "INCIDENT:\n"
            f"{content[:50000]}"
        )

        response = _client().invoke(prompt)
        data = _json_response(response)

        # Normalize explicit UI aliases and nullable model fields before
        # validating. An AI-generated null title must not crash extraction.
        data = _normalize_incident(data, content, {})
        data["source_metadata"] = metadata

        validated = ExtractedIncident.model_validate(data)

        return {
            **validated.model_dump(),
            "source_metadata": metadata,
        }

    except Exception as exc:
        logger.exception(
            "Incident extraction failed: %s",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "AI extraction failed or returned invalid "
                "structured output. Retry or edit the fields "
                "manually."
            ),
        ) from exc


# --------------------------------------------------
# Root cause analysis
# --------------------------------------------------

@app.post("/api/rca/analyze")
def analyze(req: AnalyzeRequest):
    try:
        result = run_rca(
            req.incident_text,
            req.extracted_fields,
            req.evidence,
        )

        return result

    except RuntimeError as exc:
        logger.exception("RCA runtime/provider error")

        raise HTTPException(
            status_code=503,
            detail=(
                "RCA service unavailable. Check the backend "
                "terminal logs and provider configuration."
            ),
        ) from exc

    except Exception as exc:
        error_msg = str(exc).lower()
        # Surface rate-limit / overload errors with a clear retry message
        if "rate" in error_msg or "overload" in error_msg or "429" in error_msg or "too many" in error_msg:
            logger.warning("Groq rate limit / overload: %s", exc)
            raise HTTPException(
                status_code=429,
                detail=(
                    "The AI model is temporarily overloaded or rate-limited. "
                    "Wait 30–60 seconds and retry. If this persists, check your "
                    "Groq API plan usage limits."
                ),
            ) from exc

        # Keep the detailed exception in the backend terminal.
        # Do not expose internal traces or credentials to clients.
        logger.exception(
            "RCA analysis failed: %s",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "RCA analysis failed. Check the backend "
                "terminal traceback."
            ),
        ) from exc


# --------------------------------------------------
# Create investigation
# --------------------------------------------------

@app.post(
    "/api/investigations",
    response_model=InvestigationOut,
    status_code=201,
)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
):
    record = Investigation(**payload.model_dump())

    try:
        db.add(record)
        db.commit()
        db.refresh(record)

        return record

    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create investigation")

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not save investigation. "
                "No changes were committed."
            ),
        ) from exc


# --------------------------------------------------
# List investigations
# --------------------------------------------------

@app.get(
    "/api/investigations",
    response_model=list[InvestigationOut],
)
def list_investigations(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    statement = (
        select(Investigation)
        .order_by(desc(Investigation.created_at))
        .offset(offset)
        .limit(limit)
    )

    return list(db.scalars(statement))


# --------------------------------------------------
# Get investigation by ID
# --------------------------------------------------

@app.get(
    "/api/investigations/{investigation_id}",
    response_model=InvestigationOut,
)
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db),
):
    record = db.get(Investigation, investigation_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found.",
        )

    return record


# --------------------------------------------------
# Update investigation
# --------------------------------------------------

@app.put(
    "/api/investigations/{investigation_id}",
    response_model=InvestigationOut,
)
def update_investigation(
    investigation_id: int,
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
):
    record = db.get(Investigation, investigation_id)

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found.",
        )

    try:
        for key, value in payload.model_dump().items():
            setattr(record, key, value)

        db.commit()
        db.refresh(record)

        return record

    except Exception as exc:
        db.rollback()
        logger.exception("Failed to update investigation")

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not update investigation. "
                "No changes were committed."
            ),
        ) from exc
