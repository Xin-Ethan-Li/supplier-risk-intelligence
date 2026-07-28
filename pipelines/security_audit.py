from __future__ import annotations

import json
import re
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_TEXT_BYTES = 2_000_000

SECRET_PATTERNS = {
    "private-key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "aws-access-key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,255}\b"),
    "openai-key": re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"),
    "slack-token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    "google-api-key": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
}

DISALLOWED_NAMES = {
    ".env",
    "id_rsa",
    "id_ed25519",
    "credentials.json",
    "service-account.json",
}
DISALLOWED_SUFFIXES = {".p12", ".pfx", ".key", ".pem"}


@dataclass(frozen=True)
class Finding:
    path: str
    kind: str
    line: int | None = None


def tracked_and_untracked_files(root: Path = ROOT) -> list[Path]:
    output = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return [root / line for line in output.splitlines() if line]


def scan_text(path: Path, text: str, root: Path = ROOT) -> list[Finding]:
    findings: list[Finding] = []
    relative = path.relative_to(root).as_posix() if path.is_absolute() else path.as_posix()
    for line_number, line in enumerate(text.splitlines(), start=1):
        for kind, pattern in SECRET_PATTERNS.items():
            if pattern.search(line):
                findings.append(Finding(relative, kind, line_number))
    return findings


def scan_repository(root: Path = ROOT) -> list[Finding]:
    findings: list[Finding] = []
    for path in tracked_and_untracked_files(root):
        relative = path.relative_to(root).as_posix()
        if path.name in DISALLOWED_NAMES or path.suffix.lower() in DISALLOWED_SUFFIXES:
            findings.append(Finding(relative, "sensitive-file"))
            continue
        if not path.is_file() or path.stat().st_size > MAX_TEXT_BYTES:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        findings.extend(scan_text(path, text, root))
    return findings


def main() -> None:
    findings = scan_repository()
    result = {
        "status": "failed" if findings else "passed",
        "filesScanned": len(tracked_and_untracked_files()),
        "findings": [asdict(finding) for finding in findings],
    }
    print(json.dumps(result, indent=2))
    if findings:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
