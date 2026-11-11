# NewsMind — Product Requirements Document

**Document status:** Baseline specification  
**Version:** 1.0  
**Last reviewed:** 2026-11-10  
**Project type:** Personal AI-assisted news monitoring web application

## 1. Product summary

NewsMind is a personal news-monitoring application. It collects articles from user-selected RSS/Atom feeds on an hourly schedule, removes duplicates, filters articles against configurable interests, optionally analyzes selected items with a free-tier online AI API, stores the results, and presents them in a responsive web dashboard. It can send opt-in browser/phone push notifications for important new articles.

The system is **hybrid**: collection, API, scheduled processing and database run on Cloudflare; the dashboard is hosted on Vercel; AI inference uses an online API only when enabled. The user's Windows laptop is for development and maintenance, not production collection. It does not need to stay online after deployment.

## 2. Problem and intended user

The user wants one place to monitor a changing set of subjects across news publishers and research feeds without manually checking many sites. The system must reduce noise, preserve direct source links, and surface only worthwhile updates.

**Initial audience:** one owner (personal use). Multi-user accounts, teams and public sign-up are not part of v1.

## 3. Goals

1. Collect public RSS/Atom metadata from configurable sources every hour.
2. Continue collecting even when the user's laptop is off.
3. Store articles persistently and prevent duplicate records.
4. Let the owner define sources, topics, keywords and notification preferences.
5. Provide an accessible, responsive browser dashboard.
6. Optionally summarize and classify selected articles with a free-tier AI API.
7. Send web push notifications for new, high-priority items when the user has opted in.
8. Keep operating cost at **$0 target** with no automatic paid upgrade or fallback.
9. Keep implementation small enough to develop and maintain on a Windows 11 laptop with 4 GB RAM and no dedicated GPU.

## 4. Non-goals for v1

- Training or hosting a foundation model.
- Running Ollama or another local LLM on the 4 GB laptop.
- Scraping full publisher websites as the normal collection method.
- Circumventing paywalls, login walls, CAPTCHAs, bot protections or publisher restrictions.
- Reproducing complete copyrighted articles in NewsMind.
- A multi-agent architecture, autonomous browser agent, vector database or semantic knowledge graph.
- Social feeds, email digests, Telegram, WhatsApp or native Android/iOS applications.
- Multi-user workspaces, public registration or commercial use.
- Guaranteed real-time news delivery. Hourly collection is the target cadence and provider/platform execution can be delayed.

## 5. Locked product and architecture decisions

| Area | Decision |
|---|---|
| Product | NewsMind personal news-monitoring dashboard |
| Deployment | Split: Vercel frontend + Cloudflare backend |
| Frontend | React + TypeScript + Vite, deployed to Vercel Hobby for personal use |
| Backend | Cloudflare Worker, TypeScript, native Fetch/Request/Response APIs |
| Schedule | Cloudflare Cron Trigger: `0 * * * *` (hourly, UTC) |
| Database | Cloudflare D1 (SQLite-compatible managed database) |
| Feed formats | RSS 2.0 and Atom |
| Feed parser | `fast-xml-parser` for the first implementation; reassess only if a demonstrated issue requires a change |
| AI | Optional online free-tier API; Gemini is a candidate, not a permanent guarantee |
| AI behavior | No paid model, no paid fallback, no automatic provider switching |
| Notifications | Web Push through a service worker and VAPID credentials |
| Development OS | Windows 11, PowerShell |
| Hardware constraint | Acer Aspire A314-22, Ryzen 3, 4 GB RAM, no dedicated GPU |
| Package manager | npm; do not add a monorepo build tool without need |
| Browser collection | Not in v1; RSS/Atom first |

### Architecture diagram

```text
                    ┌──────────────────────────────┐
                    │        User's devices        │
                    │ Desktop browser / phone PWA  │
                    └──────────────┬───────────────┘
                                   │ HTTPS
                    ┌──────────────▼───────────────┐
                    │        Vercel Hobby          │
                    │ React + Vite dashboard      │
                    │ Static frontend / PWA files │
                    └──────────────┬───────────────┘
                                   │ HTTPS API requests
                    ┌──────────────▼───────────────┐
                    │       Cloudflare Worker     │
                    │ API + validation + auth     │
                    │ RSS/Atom collection logic   │
                    │ AI calls (when enabled)     │
                    │ Web Push sender             │
                    └───────┬──────────┬──────────┘
                            │          │
                 hourly Cron          │ D1 binding
                 `0 * * * *`          │
                            │          ▼
                    ┌───────▼───┐  ┌────────────────┐
                    │ Feed URLs │  │ Cloudflare D1  │
                    │ RSS/Atom  │  │ articles       │
                    └───────────┘  │ sources        │
                                   │ settings       │
                    ┌───────────┐  │ push records   │
                    │ Free-tier │  │ run history    │
                    │ AI API    │  └────────────────┘
                    └───────────┘
```

The Cron Trigger is part of the Cloudflare Worker. Vercel is for the dashboard, not the production news scheduler. The laptop is not in the production request path.

## 6. User workflow

1. Owner opens the NewsMind dashboard.
2. Owner configures enabled feeds and topics.
3. Cloudflare runs the scheduled collector hourly.
4. Each feed is fetched independently. A failure for one source must not stop other feeds.
5. Parser extracts permitted feed metadata and validates it.
6. Articles are normalized and deduplicated before insertion.
7. Rule-based filters select articles relevant to the owner's interests.
8. If AI is enabled and free quota limits permit, selected articles are sent to the configured free-tier provider for structured analysis.
9. Dashboard lists articles with source, date, category, short summary/excerpt and original link.
10. New articles above the configured notification threshold trigger Web Push if the device has a valid subscription.
11. Owner can mark read, save, search and change filters/preferences.

## 7. Functional requirements

### FR-01 — Source management

- Seed a small verified starter set of RSS/Atom feeds.
- Owner can enable/disable sources and add/remove a source URL through the dashboard after the authenticated source-management feature is implemented.
- Each source has: `id`, `name`, `feed_url`, optional category, `enabled`, `last_checked_at`, `last_success_at`, `etag`, `last_modified`, status and last error summary.
- Validate scheme and URL. Permit HTTPS by default. Do not fetch loopback, private-network, link-local or local hostnames. Revalidate redirects and final URL to reduce SSRF risk.
- Invalid or unavailable feeds show a per-source error; they do not crash the full collection run.

### FR-02 — RSS/Atom ingestion

- Support RSS 2.0 and Atom feeds.
- Extract title, stable ID/GUID where present, article URL, publication/update date, author if available, and feed-provided description/summary.
- Do not require article-page scraping for the v1 ingestion path.
- Limit request time, response size, feed entry count and concurrent feed requests.
- Use conditional requests (`ETag` / `If-Modified-Since`) where supported.
- Validate article URLs as HTTP(S); store the publisher URL as the source of truth.
- Preserve original publication date separately from collection time.

### FR-03 — Deduplication

- Same article must not be inserted repeatedly across hourly runs.
- Prefer normalized canonical URL as the global unique key. Use feed GUID/ID only as a fallback when no usable URL exists.
- URL normalization must be conservative. Remove known tracking parameters only when safe; do not strip arbitrary query parameters that may identify a real article.
- Store `first_seen_at` and `last_seen_at` where useful.
- A duplicate must not trigger another push notification or another AI analysis unless the owner explicitly requests re-analysis.

### FR-04 — Topic and keyword filtering

- Support user-defined topic labels and include/exclude keywords.
- Initial matching can be deterministic string matching; no embedding model or vector database.
- Matching should inspect title and feed summary/excerpt, not a full publisher page.
- Keep a clear distinction between a keyword match and an AI-generated relevance score.
- Filtering must work when AI is disabled or unavailable.

### FR-05 — AI analysis (optional)

- AI is disabled by default until the owner supplies a free-tier API key and explicitly enables analysis.
- Initial provider candidate: Gemini Developer API, subject to current model availability, quota, pricing and data-use review at implementation time.
- Call the provider from Cloudflare Worker only. Never expose API credentials to browser JavaScript, Vercel static assets or source control.
- Analyze only new articles that passed rule-based filters.
- Start with a strict cap of **5 articles per hourly run** and a configurable daily cap. The cap must be enforced server-side.
- Request a compact structured response: short summary, category, relevance 1–5, importance 1–5, why it matters, and notification recommendation.
- AI output is untrusted. Validate its shape and range; render as text, not trusted HTML.
- Keep the original headline, source, timestamp and URL visible. AI must not replace the primary source.
- No Google Search grounding, paid feature, paid provider or automatic paid fallback.
- If the provider is unavailable, returns quota/rate errors, or the free tier is no longer available, retain the article and mark analysis as pending/skipped. Continue non-AI collection.
- Show the owner a clear notice that Gemini free-tier prompts may be used by Google to improve products, according to the current Gemini API pricing terms. Obtain explicit opt-in before sending article excerpts. Recheck current terms before release.

### FR-06 — Dashboard

- Responsive desktop and mobile web application.
- Main views: All News, Important, Topics, Saved, Sources, Settings.
- Article row/card must show title, publisher, publication time, category/topic, short excerpt/AI summary when available, read/save state and an original-source link.
- Search by title and summary; filter by source, topic, date, read state and importance.
- Mark read/unread and save/unsave.
- Show last successful collection time, next expected run (approximate), source errors and AI status.
- Provide honest loading, empty, unavailable and error states. Never display fake counts or fake news.
- Opening an article goes to the original publisher; do not reproduce the full article body.

### FR-07 — Web Push

- User must explicitly opt in through the browser's permission prompt.
- Use an active service worker and Push API; serve the PWA over HTTPS in production.
- Save push subscription data in D1 and keep endpoint/key material private.
- Generate and store VAPID public/private keys. Private key stays in Cloudflare Worker secrets.
- Provide a disable/unsubscribe action and delete expired/invalid subscriptions after provider errors.
- Start with notifications for newly collected items scoring importance 4 or 5. Make threshold configurable.
- Avoid duplicate notifications for the same article and subscription.
- Notification includes concise title, publisher, short reason/summary and link to NewsMind article view; dashboard provides original source link.
- iOS support requires the user to install the site as a Home Screen web app on supported iOS versions. Explain browser-specific limitations in the UI/help.

### FR-08 — Collection history and status

- Record start/end time, feeds attempted, feeds succeeded/failed, new articles, duplicates, AI analyses, push outcomes and error summaries.
- Do not log API keys, session tokens, VAPID private keys or full push subscription secrets.
- Dashboard shows recent runs and per-feed health.

## 8. Proposed data model

Use D1 migrations and plain SQL. No ORM for v1.

| Table | Purpose | Important fields |
|---|---|---|
| `sources` | Feed configuration and health | `id`, `name`, `feed_url`, `category`, `enabled`, `etag`, `last_modified`, `last_checked_at`, `last_success_at`, `last_error` |
| `articles` | Collected article and optional analysis | `id`, `source_id`, `guid`, `canonical_url`, `title`, `excerpt`, `author`, `published_at`, `collected_at`, `last_seen_at`, `topic`, `relevance_score`, `importance_score`, `ai_summary`, `why_it_matters`, `analysis_status`, `is_read`, `is_saved` |
| `collection_runs` | Execution history | `id`, `started_at`, `finished_at`, `status`, `feeds_attempted`, `feeds_succeeded`, `new_articles`, `duplicates`, `error_summary` |
| `push_subscriptions` | Device subscriptions | `id`, `endpoint`, encrypted/required key fields, `created_at`, `last_success_at`, `last_error_at`, `active` |
| `settings` | Single-owner preferences | `key`, `value`, `updated_at` |

Implementation notes:
- Use SQL constraints and indexes to enforce uniqueness and support common queries.
- Store timestamps as ISO-8601 UTC strings or integer Unix timestamps consistently; choose one convention and document it before migrations.
- Never put secrets in D1 settings or article records.
- A saved article should not be automatically removed by retention cleanup.
- Retention policy is configurable. Proposed initial default: remove un-saved article records older than 180 days; confirm before implementing destructive cleanup.
- Database schema changes must be migrations, not ad-hoc production edits.

## 9. API contract (planned)

Prefix: `/api/v1`

| Method | Route | Purpose | Access |
|---|---|---|---|
| GET | `/health` | Health/status, no secrets | Public minimal response |
| GET | `/articles` | Paginated/searchable article list | Owner only |
| GET | `/articles/:id` | Article detail | Owner only |
| PATCH | `/articles/:id` | Read/save state | Owner only |
| GET | `/sources` | List sources | Owner only |
| POST | `/sources` | Add source | Owner only |
| PATCH | `/sources/:id` | Enable/disable/edit | Owner only |
| DELETE | `/sources/:id` | Remove source | Owner only |
| GET | `/runs` | Recent collection runs | Owner only |
| POST | `/push/subscribe` | Add current device subscription | Owner only |
| POST | `/push/unsubscribe` | Remove current device subscription | Owner only |
| POST | `/admin/collect` | Manual collection trigger | Owner/admin only; protected |

Cron uses the Worker `scheduled()` handler directly. Do not expose an unauthenticated public `/collect` endpoint.

Before public dashboard release, implement one-owner authentication, exact-origin CORS, CSRF protections appropriate to the chosen session/token mechanism, and rate limits on login/admin routes. Keep auth choice as an explicit implementation gate; do not ship a publicly accessible personal dashboard/API without it.

## 10. Security, privacy and content handling

- Store secrets with Cloudflare Worker secrets, not `.env` committed to Git, frontend build variables, D1 or logs.
- `.env`, `.dev.vars`, private keys, local databases and credentials must be in `.gitignore`.
- Do not use `VITE_` or other public frontend variables for secrets.
- Validate request bodies, route parameters, URLs and AI output at trust boundaries.
- Escape/render all feed and AI text as text. Never inject feed HTML with `dangerouslySetInnerHTML`.
- Use restrictive CORS: known Vercel production origin and local development origin only; no wildcard when credentials are involved.
- Use HTTPS in production.
- Protect admin operations and push subscription changes with authentication and CSRF controls.
- Do not fetch arbitrary user-supplied URLs without validation and redirect checks.
- Collect/store only article metadata and limited feed excerpts. Link back to publisher. Respect feed/publisher terms and rate limits.
- Avoid unnecessary personal data; v1 is single-owner.

## 11. Non-functional requirements

### Performance and resource use

- Worker code must stay within current Cloudflare Free plan limits.
- Keep RSS requests bounded: small source set initially, low concurrency, timeouts, response-size limits and entry limits.
- Do not run a browser, headless Chromium, Docker or local model in production.
- Frontend should be a lightweight static Vite build. Avoid a large UI framework or charting library unless a real requirement appears.
- Paginate article lists; do not fetch the entire database for the dashboard.

### Reliability

- A single feed error must not cancel other feed results.
- Use bounded retries only for transient network failures; avoid retry storms.
- Collection must be idempotent.
- A failed AI or push operation must not discard collected articles.
- Log enough diagnostic information to identify a failed source without logging secrets.

### Accessibility and responsive design

- Semantic HTML, keyboard support, visible focus, readable type and sufficient contrast.
- Mobile-first layout for the article list and settings.
- Respect reduced-motion preferences.
- Do not rely only on color to convey status.

## 12. Visual design direction — no AI slop

NewsMind should feel like a compact editorial/newsroom tool, not a generic AI SaaS landing page.

- Use a restrained neutral palette, one purposeful accent color, strong typography and consistent spacing.
- Prioritize article titles, publishers, time, topic and source links.
- Prefer clean editorial rows and separators over a dashboard made entirely of rounded cards.
- Show real data only. No invented user avatars, fake analytics, fake activity, fake article counts or filler charts.
- Avoid gradient blobs, glassmorphism, glowing borders, giant marketing headlines, excessive rounded cards, random icon decoration, meaningless badges and unnecessary animations.
- Use icons only when they improve navigation or status comprehension.
- Provide deliberate empty/error/loading states; don't fill them with generic AI copy.
- Keep desktop information-dense but readable; collapse to one column on mobile.
- Do not use the phrase “AI-powered” as a substitute for explaining a feature.

## 13. Cost policy — hard requirement

Target operating cost: **$0/month**.

- Use Vercel Hobby for personal frontend hosting only. Do not use it for the hourly production collector.
- Use Cloudflare Workers Free + D1 Free for the backend while within published limits.
- The hourly Cron Trigger is Cloudflare's `0 * * * *` schedule (UTC).
- Monitor the current free limits during implementation; they can change.
- Do not enter payment details or upgrade plans as part of setup unless the owner explicitly authorizes it.
- Do not enable paid features, paid models, paid grounding/search, or automatic paid failover.
- AI is optional. If free quota is unavailable, disabled or exhausted, skip analysis and continue storing/filtering articles.
- Enforce a server-side AI cap: 5 articles per hour initially and a configurable daily cap.
- Do not assume an API provider's free tier will remain free. Recheck current official pricing/terms before enabling it.
- If a quota/limit is reached, fail closed for the optional feature and report the limit; never silently start paid usage.

### Current published limit references (review again before deployment)

- Cloudflare Workers Free: 100,000 requests/day, 10 ms CPU per HTTP/Cron invocation, 128 MB memory, 50 subrequests per invocation, and 5 Cron Triggers per account. Cron CPU is a real constraint; optimize/measure the parser and use small batches. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Cloudflare D1 Free: 5 million rows read/day, 100,000 rows written/day and 5 GB total account storage. Individual free database size is limited separately (currently 500 MB). [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- Cloudflare Cron Triggers execute on UTC. [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- Vercel Hobby is for personal, non-commercial use. [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- Gemini API pricing currently lists free-tier model access and states free-tier content may be used to improve Google's products. Verify model-specific quotas and data terms before enabling. [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Web Push requires an active service worker and a subscription; production requires a secure context. [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) · [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## 14. Acceptance criteria for v1

V1 is complete only when all are true:

1. Owner can access the deployed dashboard securely from desktop and phone.
2. Cloudflare collects enabled feeds hourly without the laptop running.
3. RSS 2.0 and Atom feeds are parsed; per-source failures are visible.
4. Articles are persisted in D1 and duplicate links do not create duplicate rows or repeated notifications.
5. Owner can add/disable sources and configure topics/keywords.
6. Dashboard supports search, filters, pagination, read/unread and saved state.
7. AI can be disabled completely; when enabled, only free-tier calls are used within server-side caps.
8. AI quota failure does not interrupt ingestion or trigger paid failover.
9. Owner can opt in/out of Web Push and receive eligible new-article notifications on supported devices.
10. Production admin/API routes are protected; secrets are not exposed in the browser or repository.
11. No feature requires the 4 GB laptop to run continuously.
12. Free-tier usage is monitored and the app does not intentionally upgrade or incur a paid charge.

## 15. Known risks and unresolved decisions

| Item | Risk / decision needed | Rule |
|---|---|---|
| Cloudflare 10 ms CPU | Parsing too many/large feeds may exceed free CPU | Measure first; limit feed count/bytes/entries; split work only if proven necessary. Never auto-upgrade. |
| RSS reliability | Publishers may change or remove feed URLs | Per-source health, conditional fetch, clear errors and manual source editing. |
| Google News RSS | Endpoint is not a documented public API and may change | Treat as optional source; do not make it a required dependency. |
| Gemini terms | Free-tier data use may include product improvement | Disclose and request explicit opt-in before sending excerpts. |
| Authentication | Cross-origin dashboard/API session design needs a secure choice | Resolve before public release. Evaluate same-origin Vercel rewrite or a minimal single-owner auth method; do not expose open admin endpoints. |
| Web Push compatibility | Browser/device behavior differs; push encryption implementation needs Worker compatibility | Test Chrome/Edge desktop and target phone before calling complete. |
| Feed copyright | RSS descriptions may have publisher-specific terms | Store limited metadata/excerpts and link to original source. |
| Free quotas change | Provider plans/limits may change | Recheck official docs before deploy; degrade gracefully instead of upgrading. |

## 16. Definition of done for each engineering task

- Requirements for the current task are met; no later phase is started early.
- Changes are scoped and understandable.
- Relevant typecheck/build/tests pass, or any unrun check is reported with reason.
- No secrets, fake production data or unrelated refactors are introduced.
- Error states and input validation are preserved.
- The handoff states files changed, commands/tests run and remaining blockers.
