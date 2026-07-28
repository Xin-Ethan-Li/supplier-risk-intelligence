# Security and Privacy

## 1. Scope

This document describes the controls implemented by the public Supplier Risk Intelligence portfolio demo. It is not a security claim about the historical enterprise SRM platform.

## 2. Data classification and lifecycle

- The committed structured dataset is deterministically generated synthetic data.
- Supplier names, documents, incidents and citations are fictional.
- The public MVP does not accept file uploads, authentication credentials or payment data.
- Evaluation inputs are processed in memory and are not written to a database, cache or object store.
- API logs do not include request bodies or full questions. Authorization, Cookie, API key and Set-Cookie headers are explicitly redacted.
- Request and Correlation IDs are operational identifiers; they must not contain personal or confidential data.

Users should not submit real supplier, employer, personal or confidential information. The demo is not procurement or financial advice.

## 3. Implemented controls

| Boundary         | Control                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Browser to API   | Explicit CORS origin allowlist; only GET, POST and OPTIONS; bounded allowed headers                                                    |
| Public request   | 64 KiB body limit, JSON Schema validation, question length limit and 30 requests/minute default                                        |
| Service call     | Configurable 2-second Risk Engine deadline with AbortController                                                                        |
| Failure response | Separate 502, 503 and 504 dependency classes; generic internal errors; no stack traces                                                 |
| Browser security | Helmet security headers; API is not frameable outside the same origin                                                                  |
| Tracing          | Trusted-character Request and Correlation IDs; invalid values are replaced with UUIDs                                                  |
| Containers       | Non-root API and Risk Engine users, read-only root filesystems, temporary `/tmp`, dropped Linux capabilities and no-new-privileges     |
| Secrets          | `.env` and private source materials are ignored; repository scanner checks common high-confidence credentials and sensitive file types |
| Supply chain     | Frozen pnpm lockfile, explicit build-script allowlist, `pnpm audit` and `pip-audit`                                                    |

All numeric security settings are bounded and validated during API startup. Invalid configuration fails closed instead of silently falling back.

## 4. Threats explicitly reduced

- Oversized JSON and long text resource exhaustion.
- Browser calls from unapproved origins.
- Simple request floods against the public demo.
- Hanging or unavailable internal Risk Engine requests.
- Leakage of stack traces, raw network errors and common secret-bearing headers.
- Accidental commitment of credential files, private keys or common provider tokens.
- Container writes to application files and avoidable root privileges.
- Known dependency vulnerabilities reported by the configured package audits.

## 5. Known limitations

- Rate limiting is in-memory and per API process. Multi-instance deployment requires a shared Redis-backed limiter.
- There is no user authentication because all operations use fixed synthetic/fictional assets. The API must not be extended to private data without authorization and tenancy controls.
- Request cancellation stops the public API wait but cannot forcibly interrupt an already-running CPU operation inside the Python process.
- The public profile has no WAF, managed DDoS protection, centralized log store or SIEM integration.
- Automated Secret and dependency scans reduce risk but cannot prove that a repository is vulnerability-free.
- axe-core covers automated accessibility rules only; it does not replace assistive-technology and human review.
- Local plain HTTP URLs are for development. Public deployment must terminate HTTPS and configure the production CORS allowlist.

## 6. Reproducible checks

```bash
python -m pipelines.security_audit
pnpm audit --audit-level high
python -m pip_audit
pnpm verify
docker compose config --quiet
```

The browser failure path and accessibility checks run with:

```bash
pnpm --filter @srm/web qa:browser
```

## 7. Reporting a concern

Do not open a public issue containing a credential, personal record or exploitable payload. Use the private contact channel listed on the repository owner's GitHub profile and include only the minimum reproduction details required.
