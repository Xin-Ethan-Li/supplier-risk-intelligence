from pathlib import Path

from pipelines.security_audit import scan_text


def test_secret_scanner_detects_high_confidence_credential() -> None:
    fake_key = "AKIA" + "ABCDEFGHIJKLMNOP"
    findings = scan_text(Path("fixture.txt"), f"token={fake_key}")

    assert [(finding.kind, finding.line) for finding in findings] == [
        ("aws-access-key", 1)
    ]


def test_secret_scanner_ignores_documented_environment_placeholder() -> None:
    findings = scan_text(Path(".env.example"), "OPTIONAL_API_KEY=replace-me")

    assert findings == []
