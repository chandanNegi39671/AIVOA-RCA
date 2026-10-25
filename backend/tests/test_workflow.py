import json

from app import workflow as workflow_module


class FakeMessage:
    def __init__(self, content):
        self.content = content


class FakeClient:
    def __init__(self, responses):
        self.responses = responses

    def invoke(self, prompt):
        assert prompt
        return FakeMessage(self.responses.pop(0))


def test_run_rca_handles_null_model_title_and_ui_aliases(monkeypatch):
    responses = [
        json.dumps({
            "title": None,
            "incident_date": None,
            "product": None,
            "batch": None,
            "deviation_description": None,
            "impact": None,
            "known_facts": [],
            "assumptions": [],
            "unknowns": [],
        }),
        json.dumps({
            "five_whys": [],
            "fishbone": {},
            "hypotheses": [],
            "contributing_factors": [],
            "evidence_gaps": ["Confirm queue duration and affected order count."],
            "capas": [],
        }),
    ]
    fake_client = FakeClient(responses)
    monkeypatch.setattr(workflow_module, "_client", lambda: fake_client)

    result = workflow_module.run_rca(
        incident_text=(
            "Several orders were dispatched later than expected. "
            "The processing queue increased during the previous shift."
        ),
        extracted_fields={
            "incident_title": "Delayed customer order dispatch",
            "deviation_description": "Orders were dispatched later than expected.",
            "known_facts": [
                "Quality team identified delayed dispatch."
            ],
        },
        evidence=["Initial quality team incident description"],
    )

    assert result["incident"]["title"] == "Delayed customer order dispatch"
    assert result["incident"]["deviation_description"] == (
        "Orders were dispatched later than expected."
    )
    assert result["incident"]["known_facts"] == [
        "Quality team identified delayed dispatch."
    ]
    assert result["review_required"] is True
    assert result["fishbone"] == {
        "People": [],
        "Process": [],
        "Equipment": [],
        "Materials": [],
        "Measurement": [],
        "Environment": [],
    }
    assert result["evidence_gaps"] == [
        "Confirm queue duration and affected order count."
    ]


def test_run_rca_uses_neutral_title_when_model_title_is_null(monkeypatch):
    responses = [
        json.dumps({
            "title": None,
            "incident_date": None,
            "product": None,
            "batch": None,
            "deviation_description": None,
            "impact": None,
            "known_facts": [],
            "assumptions": [],
            "unknowns": [],
        }),
        json.dumps({
            "five_whys": [],
            "fishbone": {},
            "hypotheses": [],
            "contributing_factors": [],
            "evidence_gaps": [],
            "capas": [],
        }),
    ]
    fake_client = FakeClient(responses)
    monkeypatch.setattr(workflow_module, "_client", lambda: fake_client)

    result = workflow_module.run_rca(
        incident_text="A quality incident was reported for investigation.",
        extracted_fields={},
        evidence=[],
    )

    assert result["incident"]["title"] == "Incident requiring investigation"
    assert result["incident"]["deviation_description"] == (
        "A quality incident was reported for investigation."
    )


def test_json_response_rejects_non_object():
    try:
        workflow_module._json_response(FakeMessage('["not", "an", "object"]'))
    except ValueError as exc:
        assert "JSON object" in str(exc)
    else:
        raise AssertionError("Expected a ValueError for a JSON array")
