# NewsMind — Project Task Board

**Status:** Phase 1 complete; Phase 2 active.
**Current active phase:** Phase 2 — D1 persistence and reliable ingestion.
**Owner:** Personal project.
**Target:** Free-first, hourly news monitoring, Vercel + Cloudflare.

## 1. Mission

Build NewsMind: a personal RSS/Atom news monitor with a responsive web dashboard, optional free-tier AI analysis and opt-in Web Push notifications. Collection must run in Cloudflare, not on the owner's laptop.

## 2. Locked decisions

- [x] Product name: NewsMind.
- [x] Deployment split: Vercel frontend, Cloudflare Worker backend.
- [x] Collection cadence: hourly.
- [x] Schedule owner: Cloudflare Cron Trigger, `0 * * * *` UTC.
- [x] Database: Cloudflare D1.
- [x] Collection input: RSS/Atom feeds first.
- [x] AI: free-tier API only, optional, never auto-upgrade or paid-fallback.
- [x] Notifications: browser/phone Web Push.
- [x] Development environment: Windows 11 + PowerShell; 4 GB RAM; no GPU.
- [x] No need to keep the laptop online after deployment.
- [x] Minimal code/dependencies; no Docker, local LLM, headless browser, Redis, ORM or multi-agent framework for v1.

## 3. Repository target

```text
NewsMind/
├── AGENTS.md
├── PRD.md
├── README.md
├── TASK.md
├── apps/
│   ├── worker/                 # Cloudflare Worker: API, RSS, Cron, AI, push
│   │   ├── src/
│   │   ├── migrations/
│   │   ├── package.json
│   │   └── wrangler.jsonc
│   └── dashboard/              # React + TypeScript + Vite + PWA
│       ├── public/
│       ├── src/
│       └── package.json
└── .gitignore
```

Do not add a root monorepo tool, shared package, Docker Compose file or extra service just to match this diagram. Create only directories needed by the active phase. The `apps/worker` and `apps/dashboard` folders can be independent npm projects.

## 4. Work phases

### Phase 0 — Repository and environment

- [x] Check `node --version` and `npm --version` in PowerShell.
- [x] Confirm Node 24.x works with the current Cloudflare project generator.
- [x] Create `D:\NewsMind` and initialize a Git repository only when the owner wants version control.
- [x] Place `AGENTS.md`, `PRD.md`, `README.md`, `TASK.md` at repository root.
- [x] Add `.gitignore` before adding any local variables or credentials.
- [x] Do not install global CLI tools; use `npx`/project-local dependencies.

**Done when:** the project folder exists and the documents are visible at its root. No cloud account or payment details required.

### Phase 1 — Local RSS ingestion prototype (COMPLETED ✅)

**Goal:** Prove feed collection and parsing locally before adding persistence, AI, dashboard or deployment.

- [x] Scaffold `apps/worker` with Cloudflare's official `create-cloudflare` generator, Worker-only TypeScript template.
- [x] Install only `fast-xml-parser` for XML parsing.
- [x] Add a small static starter feed list: BBC News, BBC Technology, arXiv `cs.AI`, and optional Google News AI query feed.
- [x] Add `GET /health` returning a minimal JSON health response.
- [x] Add `GET /preview` to fetch all configured feeds and `GET /preview?only=<feed-id>` to test one.
- [x] Support RSS 2.0 and Atom.
- [x] Extract title, URL, published date, summary/description and feed name.
- [x] Limit returned entries per feed (initially 10) and use a timeout.
- [x] Report each feed's status independently (`ok`, `empty`, `error`).
- [x] One failed feed must not fail the other feeds.
- [x] Validate source and article URL schemes; do not allow local/private targets.
- [x] Test successful, empty, malformed and unavailable feeds.
- [x] Run locally with `npx wrangler dev`.
- [x] Do not deploy, create D1, configure Cron, add AI, build frontend or request billing details in this phase.

**Acceptance tests (ALL PASSED):**

1. ✅ `/health` returns HTTP 200 and `{ "ok": true, ... }`.
2. ✅ `/preview?only=bbc-news` returns valid JSON and either actual articles or a clear source-specific error.
3. ✅ `/preview?only=arxiv-ai` handles Atom/RSS correctly according to the feed's current format.
4. ✅ `/preview` returns a result for every configured feed even if one source fails.
5. ✅ No invalid/non-HTTP(S) article link is returned as a valid article.
6. ✅ `npx wrangler dev` starts without TypeScript/build errors.
7. ✅ No API keys or paid services are required.

**Phase exit report:**
- Feed-by-feed results: BBC News (ok, 10 articles), BBC Technology (ok, 10 articles), arXiv AI (ok, 10 articles), Google News AI (ok, 10 articles)
- Sample JSON shape: `{ feeds: [{ sourceId, sourceName, status, articles[], error?, fetchedAt }], fetchedAt }`
- Commands run: `npm install`, `npm run typecheck`, `npx wrangler dev`
- Parser edge cases handled: Atom feeds with multiple link types, RSS with text nodes, malformed XML
- Remaining blockers: None for Phase 1. Ready for Phase 2.

### Phase 2 — D1 persistence and reliable ingestion (ACTIVE)

- [ ] Add D1 binding to Worker configuration.
- [ ] Add SQL migrations for `sources`, `articles` and `collection_runs`.
- [ ] Seed verified sources using a migration or an idempotent seed routine.
- [ ] Persist source health and conditional-request headers (`ETag`, `Last-Modified`).
- [ ] Normalize links conservatively and add a database uniqueness constraint.
- [ ] Insert/update articles idempotently; do not re-process duplicates.
- [ ] Add pagination-friendly indexes.
- [ ] Add bounded fetch timeout, response-size limit, entry limit and low concurrency.
- [ ] Use prepared statements and batched writes where suitable.
- [ ] Add a small repeatable test/check proving duplicate prevention.
- [ ] Verify local D1 development before remote database creation.

**Acceptance:** two consecutive collection runs do not create duplicate article rows; a failed feed is logged and other feeds continue; migrations can be applied to a clean local database.

### Phase 3 — Cloudflare backend deployment and hourly schedule

- [ ] Confirm current Cloudflare Free limits and account dashboard settings.
- [ ] Create one D1 database under the Free plan.
- [ ] Apply migrations to the remote D1 database.
- [ ] Add `scheduled()` handler.
- [ ] Configure `0 * * * *` Cron Trigger in `wrangler.jsonc` (UTC).
- [ ] Deploy Worker only after local tests pass and owner approves deployment.
- [ ] Verify the first scheduled run and collection history.
- [ ] Confirm no payment method, paid plan or usage-based feature is enabled.
- [ ] Measure CPU time and subrequest use against Workers Free limits.

**Acceptance:** Cloudflare runs collection hourly while the laptop is off; D1 stores articles; no public unauthenticated admin collection route exists.

### Phase 4 — Security and private API

- [ ] Decide and document the smallest secure single-owner authentication method compatible with Vercel-to-Worker requests.
- [ ] Do not assume Vercel Hobby password protection is included.
- [ ] Restrict CORS to known dashboard origins and local development origin.
- [ ] Protect article, source-management, manual-run and push endpoints.
- [ ] Apply CSRF protections appropriate to the chosen auth/session method.
- [ ] Store secrets in Cloudflare Worker secrets.
- [ ] Add request/body/URL validation and safe error responses.
- [ ] Ensure frontend has no server secrets.
- [ ] Test unauthorized requests, invalid sessions, bad origins and admin actions.

**Acceptance:** only the owner can access private data or mutate settings; no admin endpoint is exposed without auth.

### Phase 5 — Optional free-tier AI analysis

- [ ] Recheck official provider pricing, model status, quotas, data retention and training/product-improvement terms.
- [ ] Gemini may be evaluated as first candidate; do not assume free access is permanent.
- [ ] Explain free-tier data-use terms and get owner opt-in before sending feed excerpts.
- [ ] Keep AI disabled by default until configured.
- [ ] Store API key as Cloudflare secret only.
- [ ] Add one small AI analysis module; no provider registry or agent framework for one provider.
- [ ] Analyze only new articles already selected by non-AI filters.
- [ ] Enforce max 5 AI analyses per hourly run and a configurable daily cap.
- [ ] Validate structured AI output and score ranges.
- [ ] On quota exhaustion or provider failure, keep articles and skip AI; never switch to paid.
- [ ] Add an AI usage counter/log with no secret values.

**Acceptance:** collection continues with AI disabled; enabled AI generates validated summaries for selected articles; provider/quota failures do not lose articles or cause charges.

### Phase 6 — Vercel dashboard

- [ ] Scaffold `apps/dashboard` with React + TypeScript + Vite.
- [ ] Build a real-data dashboard, not a marketing landing page.
- [ ] Add views: All News, Important, Topics, Saved, Sources, Settings.
- [ ] Add search, date/source/topic filters, pagination, read/unread and saved state.
- [ ] Display source status, last collection and recent run errors.
- [ ] Add proper empty/loading/error states.
- [ ] Add responsive styles and accessible interactions.
- [ ] Configure API base URL through a public non-secret build variable.
- [ ] Configure CORS/proxy behavior after auth design is settled.
- [ ] Deploy to Vercel Hobby only for personal use, after auth is ready.

**Acceptance:** dashboard works on laptop and phone, uses live D1-backed API data, and contains no placeholder production data or exposed secrets.

### Phase 7 — PWA and Web Push

- [ ] Add web app manifest and service worker.
- [ ] Add explicit notification permission flow initiated by the owner.
- [ ] Generate VAPID key pair once; private key stored only as Worker secret.
- [ ] Choose a maintained Web Push implementation compatible with Cloudflare Workers; verify before adding the dependency.
- [ ] Store subscriptions securely in D1.
- [ ] Add subscribe/unsubscribe endpoints with auth and CSRF safeguards.
- [ ] Send push only for new articles meeting configured threshold (initially importance 4–5).
- [ ] Deduplicate notifications and deactivate invalid subscriptions.
- [ ] Test desktop Edge/Chrome and the owner's target phone.
- [ ] Document iOS Home Screen installation requirement where applicable.

**Acceptance:** an opted-in supported phone receives a test push with the dashboard closed; disabling notifications prevents further sends.

### Phase 8 — Release hardening

- [ ] Review security, feed terms and AI data-use disclosure.
- [ ] Test bad feeds, timeouts, malformed XML, duplicates, quota exhaustion and failed push delivery.
- [ ] Check pagination, performance, keyboard operation, contrast and mobile layouts.
- [ ] Review Cloudflare/Vercel usage pages.
- [ ] Confirm zero paid fallback and no upgrade prompts were accepted accidentally.
- [ ] Add backup/export and retention behavior if needed.
- [ ] Update README and task status with actual deployed URLs only after successful deployment.

## 5. Current next action

Start Phase 2: Add D1 binding to wrangler.jsonc, create SQL migrations for sources, articles, and collection_runs tables, and implement idempotent article insertion with deduplication.

## 6. Rules for the coding agent

- Read `AGENTS.md`, `PRD.md`, this file and `README.md` before editing.
- Work only on the active phase unless the owner explicitly changes scope.
- Inspect existing files before overwriting or moving them.
- If the project already exists, adapt it; do not recreate it.
- Ask only when a required decision is genuinely blocked. Do not ask questions already answered here.
- Never invent test results, deployment status, feed availability or provider quotas.
- Update this checklist only when the corresponding work is actually complete and verified.