# AIVOA RCA Copilot

An AI-assisted Root Cause Analysis (RCA) and Corrective & Preventive Action (CAPA) workspace engineered for pharmaceutical quality and manufacturing deviations (Active Pharmaceutical Ingredients - API).

> **Regulatory Notice & Disclaimer**: This system is an AI engineering prototype and demonstration platform. In compliance with pharmaceutical quality standards (cGMP, FDA 21 CFR Part 211/Part 11, EU Annex 11/15), all AI-generated extractions, 5-Whys chains, Ishikawa factors, hypotheses, and CAPAs are decision-support hypotheses. Qualified human review, verification, and sign-off are required prior to committing quality decisions.

---

## Architecture Overview

```
                                      ┌────────────────────────────────────────────────────────┐
                                      │                     FastAPI Backend                    │
                                      │                                                        │
┌───────────────────────────┐         │  ┌──────────────────────┐    ┌──────────────────────┐  │
│  React + Redux Toolkit UI │         │  │ Document Extractor   │    │  LangGraph Workflow  │  │
│                           │         │  │ (pypdf text stream)  │    │  (StateGraph + Groq) │  │
│  • Multi-modal Intake     │  HTTP   │  └──────────┬───────────┘    └──────────┬───────────┘  │
│    (PDF & Raw Text)       ├─────────┼─────────────┼───────────────────────────┼───────────   │
│  • Interactive 5-Whys     │  JSON   │             ▼                           ▼              │
│  • Fishbone Diagram (6M)  │         │  ┌──────────────────────────────────────────────────┐  │
│  • CAPA Workbench         │         │  │ Groq Cloud API (Llama 3.3 70B Versatile)         │  │
│  • Human Review & Edits   │         │  │ *Strictly server-side; API key never exposed     │  │
│  • Audit Trail View       │         │  └──────────────────────────────────────────────────┘  │
│                           │         │                         │                              │
│                           │         │                         ▼                              │
│                           │         │  ┌──────────────────────────────────────────────────┐  │
│                           │         │  │ Persistence Layer                                │  │
│                           │         │  │ (SQLAlchemy ORM + Alembic -> PostgreSQL/SQLite)  │  │
└───────────────────────────┘         │  └──────────────────────────────────────────────────┘  │
                                      └────────────────────────────────────────────────────────┘
```

---

## Core Capabilities

1. **Intelligent Intake & Document Extraction**:
   - Accepts deviation logs, incident reports, shift handover notes, and text-based PDF documents via multipart form upload.
   - Extracts structured metadata: Title, Incident Date, Product, Batch Number, Department, Severity, Immediate Containment, Deviation Description, and Initial Evidence.
   - Rejects scanned/image-only PDFs with an explicit OCR-unavailable warning, preventing silent hallucination or partial parsing.

2. **Standardized Pharmaceutical Quality Frameworks**:
   - **5 Whys Analysis**: Iterative causal drill-down linking each step to available evidence references.
   - **Ishikawa (Fishbone) 6M Analysis**: Evaluates Man (People), Machine (Equipment), Method (Process), Material, Measurement, and Milieu (Environment).
   - **Hypothesis Formulation**: Generates structured root cause hypotheses scored with supporting evidence, contradicting evidence, and identified evidence gaps.
   - **CAPA Generation**: Formulates targeted Corrective and Preventive actions classified by priority (High/Medium/Low) with verification criteria.

3. **Human-in-the-Loop Governance**:
   - Quality professionals retain complete editorial authority to adjust, discard, or augment any AI-generated finding before saving.
   - Enforces default review status: `Pending qualified review`.

4. **Persistence & Versioning**:
   - Full persistence via SQLAlchemy ORM with SQLite for rapid local development and PostgreSQL support for multi-user deployments.
   - Alembic database migration management.

---

## Tech Stack

| Component | Technologies |
|---|---|
| **Frontend** | React 18, Redux Toolkit, Vite, Lucide Icons, Vanilla CSS Design System |
| **Backend API** | Python 3.11+, FastAPI, Pydantic v2, Uvicorn |
| **AI Orchestration** | LangGraph 0.2+, LangChain Core, ChatGroq (`llama-3.3-70b-versatile`) |
| **PDF Extraction** | PyPDF 5.x (stream-based text extraction) |
| **Database & ORM** | PostgreSQL / SQLite, SQLAlchemy 2.0, Alembic 1.13+ |
| **Testing** | Pytest, HTTPX client |

---

## Setup & Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Groq API Key (from [console.groq.com/keys](https://console.groq.com/keys))

---

### 1. Backend Setup

Open a terminal in the `backend/` directory:

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create environment configuration
Copy-Item .env.example .env
```

Configure `backend/.env`:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=sqlite:///./aivoa_dev.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MAX_UPLOAD_MB=10
```

Run database migrations and start the server:
```powershell
# Run migrations (or let FastAPI auto-create tables on startup)
python -m alembic upgrade head

# Start FastAPI application
python -m uvicorn app.main:app --reload --port 8000
```

- API Interactive Docs (Swagger): `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

---

### 2. Frontend Setup

In a separate terminal in the project root (`AIVOA-RCA`):

```powershell
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Verification & Testing

### 1. Automated Backend Unit Tests
Execute the test suite (11 unit/integration tests covering validation, health, extraction, workflow parsing, and CRUD persistence):

```powershell
cd backend
.\.venv\Scripts\python -m pytest tests -v
```

### 2. Live Groq + Backend Smoke Test
To verify live model inference and end-to-end API integration against a running backend:

```powershell
cd backend
.\.venv\Scripts\python test_aivoa_live.py
```

### 3. Frontend Production Build
Validate production bundling and JSX/CSS assets:

```powershell
npm run build
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check (database reachability and Groq configuration status) |
| `POST` | `/api/rca/extract` | Multipart parser for PDF document or raw incident text |
| `POST` | `/api/rca/analyze` | LangGraph workflow execution generating 5-Whys, Fishbone, Hypotheses, and CAPAs |
| `POST` | `/api/investigations` | Persists an investigation with human findings and review status |
| `GET` | `/api/investigations` | Lists investigations (`limit`, `offset`) |
| `GET` | `/api/investigations/{id}` | Retrieves a single investigation by ID |
| `PUT` | `/api/investigations/{id}` | Updates investigation details and review lifecycle status |

---

## Security & Engineering Hygiene

- **Server-Side API Key Confinement**: The Groq API key is accessed exclusively by the backend via `pydantic-settings`. It is never transmitted to the frontend bundle, serialized into JSON responses, or exposed in logging.
- **Environment Exclusions**: `.gitignore` strictly ignores all `.env`, `.env.*`, virtual environments (`.venv`), local databases (`*.db`, `*.sqlite`), build directories (`dist/`), and caches.
- **Safe Template Only**: `.env.example` contains only placeholder credentials.
- **Input Validation & Guardrails**: File uploads are capped by `MAX_UPLOAD_MB`. Non-PDF files and unparseable payloads are rejected with explicit HTTP 415/422 status codes without triggering downstream LLM tokens.

---

## Known Limitations

- **Scanned Document OCR**: Current PDF ingestion extracts embedded text streams via `pypdf`. Image-only/scanned PDFs require an external OCR pre-processor and are currently rejected with a clear user prompt.
- **GxP Validation**: This repository represents an AI engineering challenge solution and prototype. It has not undergone formal 21 CFR Part 11 software validation, IQ/OQ/PQ qualifications, or electronic signature workflows required for commercial production release.
