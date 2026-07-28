from __future__ import annotations

import argparse
import json
import math
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DEFAULT_BASE_URL = "http://localhost:3100"
THRESHOLDS_MS = {
    "clientTotalP95": 1_500.0,
    "modelInferenceP95": 50.0,
    "retrievalP95": 200.0,
}


def percentile(values: list[float], quantile: float) -> float:
    if not values:
        raise ValueError("Cannot calculate a percentile without values.")
    ordered = sorted(values)
    index = max(0, math.ceil(quantile * len(ordered)) - 1)
    return ordered[index]


def request_json(
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any] | list[dict[str, Any]]:
    body = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={"content-type": "application/json", "x-request-id": "m6-benchmark"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.load(response)


def evaluate(base_url: str, scenario: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    payload = {
        "scenarioId": scenario["id"],
        "supplierMetrics": scenario["supplierMetrics"],
        "question": scenario["defaultQuestion"],
    }
    started = time.perf_counter()
    result = request_json("POST", f"{base_url}/v1/evaluations", payload)
    elapsed_ms = (time.perf_counter() - started) * 1_000
    if not isinstance(result, dict):
        raise TypeError("Evaluation response must be an object.")
    return elapsed_ms, result


def run_benchmark(base_url: str, warmup: int, requests: int) -> dict[str, Any]:
    scenarios = request_json("GET", f"{base_url}/v1/scenarios")
    version = request_json("GET", f"{base_url}/version")
    if not isinstance(scenarios, list) or len(scenarios) != 3:
        raise ValueError("Benchmark requires the three public demo scenarios.")
    if not isinstance(version, dict):
        raise TypeError("Version response must be an object.")

    for index in range(warmup):
        evaluate(base_url, scenarios[index % len(scenarios)])

    client_total: list[float] = []
    api_total: list[float] = []
    model: list[float] = []
    retrieval: list[float] = []
    fusion: list[float] = []
    bands: dict[str, int] = {}
    for index in range(requests):
        elapsed_ms, result = evaluate(base_url, scenarios[index % len(scenarios)])
        telemetry = result["telemetry"]
        client_total.append(elapsed_ms)
        api_total.append(float(telemetry["totalMs"]))
        model.append(float(telemetry["modelInferenceMs"]))
        retrieval.append(float(telemetry["retrievalMs"]))
        fusion.append(float(telemetry["fusionMs"]))
        band = result["risk"]["riskBand"]
        bands[band] = bands.get(band, 0) + 1

    metrics = {
        "clientTotalMs": {
            "p50": percentile(client_total, 0.50),
            "p95": percentile(client_total, 0.95),
            "max": max(client_total),
        },
        "apiReportedTotalMs": {
            "p50": percentile(api_total, 0.50),
            "p95": percentile(api_total, 0.95),
            "max": max(api_total),
        },
        "modelInferenceMs": {"p95": percentile(model, 0.95), "max": max(model)},
        "retrievalMs": {"p95": percentile(retrieval, 0.95), "max": max(retrieval)},
        "fusionMs": {"p95": percentile(fusion, 0.95), "max": max(fusion)},
    }
    checks = {
        "clientTotalP95": metrics["clientTotalMs"]["p95"] < THRESHOLDS_MS["clientTotalP95"],
        "modelInferenceP95": (
            metrics["modelInferenceMs"]["p95"] < THRESHOLDS_MS["modelInferenceP95"]
        ),
        "retrievalP95": metrics["retrievalMs"]["p95"] < THRESHOLDS_MS["retrievalP95"],
    }
    return {
        "generatedAt": datetime.now(UTC).isoformat(),
        "profile": "single-user warmed sequential Docker baseline",
        "baseUrl": base_url,
        "serviceVersion": version.get("version"),
        "milestone": version.get("milestone"),
        "warmupRequests": warmup,
        "measuredRequests": requests,
        "scenarioBands": bands,
        "metrics": metrics,
        "thresholdsMs": THRESHOLDS_MS,
        "checks": checks,
        "status": "passed" if all(checks.values()) else "failed",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark the public supplier-risk API.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--warmup", type=int, default=3)
    parser.add_argument("--requests", type=int, default=18)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.warmup < 0 or args.requests < 3:
        parser.error("warmup must be non-negative and requests must be at least 3")

    result = run_benchmark(args.base_url.rstrip("/"), args.warmup, args.requests)
    rendered = json.dumps(result, indent=2)
    print(rendered)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(f"{rendered}\n", encoding="utf-8")
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
