import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_aivoa.db")
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
import pytest

@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert "database" in response.json()

def test_extract_requires_content(client):
    response = client.post("/api/rca/extract", data={"text": " "})
    assert response.status_code == 422

def test_extract_rejects_non_pdf(client):
    response = client.post("/api/rca/extract", data={"text": "Incident text with enough characters"}, files={"file": ("bad.txt", b"hello", "text/plain")})
    assert response.status_code == 415

def test_analyze_validates_short_text(client):
    response = client.post("/api/rca/analyze", json={"incident_text": "short"})
    assert response.status_code == 422

def test_save_and_retrieve_investigation(client):
    payload = {"title":"Yield deviation", "original_text":"Yield was below target in batch run.", "source_metadata":{"source_type":"text"}, "extracted_fields":{"product":"Example product"}, "analysis":{"review_required":True}, "human_findings":{}}
    created = client.post("/api/investigations", json=payload)
    assert created.status_code == 201, created.text
    inv_id = created.json()["id"]
    assert client.get(f"/api/investigations/{inv_id}").status_code == 200
    assert len(client.get("/api/investigations").json()) == 1

def test_missing_investigation(client):
    assert client.get("/api/investigations/99999").status_code == 404

def test_extract_rejects_empty_pdf(client):
    response = client.post("/api/rca/extract", files={"file": ("empty.pdf", b"", "application/pdf")})
    assert response.status_code == 422
    assert "empty" in response.json()["detail"].lower()

def test_extract_rejects_corrupted_pdf(client):
    response = client.post("/api/rca/extract", files={"file": ("corrupt.pdf", b"%PDF-invalid content", "application/pdf")})
    assert response.status_code == 422
    assert "could not read" in response.json()["detail"].lower()

