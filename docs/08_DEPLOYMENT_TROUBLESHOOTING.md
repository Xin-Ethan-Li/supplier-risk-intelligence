# Deployment and Troubleshooting

## Local quick start

```bash
docker compose up --build
```

Wait until `api` and `risk-engine` are healthy, then open `http://localhost:8080/demo/`. Check status with `docker compose ps` and inspect logs with `docker compose logs api risk-engine web`.

Common local issues:

| Symptom                            | Check                                         | Resolution                                                      |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Port already allocated             | `docker compose ps` and local port usage      | Free or remap 8080, 3100 or 8000; do not change container ports |
| API reports dependency unavailable | `curl http://localhost:8000/ready`            | Wait for model/index load, then inspect `risk-engine` logs      |
| Browser shows a CORS error         | Compare the browser origin with `WEB_ORIGINS` | Add the exact HTTP(S) origin without a trailing path            |
| First build is slow                | Docker build output                           | Python ML wheels dominate the first build; keep the layer cache |
| Native Python import fails         | Python version and active environment         | Use Python 3.12+ and run `pnpm bootstrap:risk`                  |

## Hosted profile

The root `render.yaml` defines two zero-cost resources:

1. `srm-risk-api-demo`: a free public Docker service on port 10000. Its deployment-only image runs Fastify and the Python Risk Engine as separate processes in one container; Risk Engine listens only on container loopback port 8000.
2. `srm-supplier-risk-demo`: a free static Astro site.

The backend uses the Frankfurt region. The browser calls only Fastify; the Risk Engine has no public port. This combined hosted profile avoids chaining two sleeping free services while the local Compose profile keeps three containers. Deploys wait for linked GitHub checks via `autoDeployTrigger: checksPass`.

### First deployment

1. Push the repository to GitHub and confirm all `CI` jobs pass.
2. In Render, create a new Blueprint and select this repository. Render reads `render.yaml`.
3. Confirm both Blueprint resources show a free plan before applying it. Do not approve a paid upgrade.
4. Wait for the combined backend and static site deploys to complete.
5. Confirm the generated service names are unchanged. If a collision changes a subdomain, update the static site's `PUBLIC_API_BASE_URL`, the API's `WEB_ORIGINS`, and the static Content Security Policy `connect-src`.
6. Run the production smoke tests below.

The demo uses no runtime secrets. Do not add employer datasets or provider keys. A future secret must be declared with `sync: false` or added through the hosting dashboard, never committed.

If a static-site build fails with `EROFS: read-only file system, unlink '/usr/bin/pnpm'`, do not run `corepack enable` in the Render build command. Render already provides `pnpm`, and enabling Corepack attempts to replace a package-manager executable in its read-only system directory. Run `pnpm install --frozen-lockfile` directly, as configured in the Blueprint.

### Free-tier controls

Before sharing the link:

- enable billing and deploy-failure email notifications;
- review Monthly Included Usage and pipeline minutes;
- keep the service count at the two Blueprint resources;
- do not attach a disk, database or paid instance;
- disable or suspend the Blueprint when the portfolio is not being used.

The free backend sleeps after inactivity and can take about one minute to wake. The Demo page displays this before submission. Render's monthly free-instance, bandwidth and build limits still apply; if a dashboard step proposes a charge, stop rather than upgrading.

### Production smoke test

Replace the hostnames only if Render assigned different service names:

```bash
curl --fail https://srm-risk-api-demo.onrender.com/ready
curl --fail https://srm-risk-api-demo.onrender.com/version
curl --fail https://srm-supplier-risk-demo.onrender.com/demo/
```

Then open the HTTPS demo in a private browser window, select each of the High, Medium and Low scenarios, evaluate, open one citation, and confirm the technical trace contains request and correlation IDs. Check a mobile viewport and confirm no confidential value appears in logs.

## GitHub repository controls

For `main`, require a pull request and the `node`, `python` and `compose` checks, dismiss stale approvals, require conversations to be resolved, and block force pushes and deletion. Enable Dependabot alerts and secret scanning where available. Repository-level settings are verified after the first push because they are not represented by files in this repository.
