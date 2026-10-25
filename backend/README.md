# AIVOA RCA backend

## Requirements
Python 3.11+ recommended. PostgreSQL is the intended persistence database; SQLite is supported for local development and tests.

## Run locally
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows; use cp on macOS/Linux
```
Set `GROQ_API_KEY` in `.env` and configure `DATABASE_URL`. For PostgreSQL, create a database/user matching the URL. For a quick local SQLite run, set `DATABASE_URL=sqlite:///./aivoa_dev.db`.

alembic upgrade head
uvicorn app.main:app --reload --port 8000
# On Windows with Smart App Control or Application Control enabled, invoke via python module:
# python -m alembic upgrade head
# python -m uvicorn app.main:app --reload --port 8000
```
Swagger: http://localhost:8000/docs

The app also creates tables on startup for a convenient fresh local development database; use Alembic migrations for schema changes/deployment. `GET /health` reports database reachability and whether a Groq key is configured; it does not send a paid model request.

## API
- `POST /api/rca/extract`: multipart `text` and/or `file` (PDF only, max size controlled by `MAX_UPLOAD_MB`).
- `POST /api/rca/analyze`: JSON with `incident_text`, optional `extracted_fields`, and `evidence`.
- `POST /api/investigations`: persist a reviewed investigation.
- `GET /api/investigations?limit=50&offset=0`
- `GET /api/investigations/{id}`

PDF extraction uses selectable text from pypdf. Image-only/scanned PDFs are rejected with an explicit OCR-unavailable message. No OCR is silently implied.

## Tests
```bash
pytest -q
```
Groq calls are not required for the automated API tests. Never put secrets in source control. AI hypotheses and CAPAs are not verified findings and require qualified human review.
