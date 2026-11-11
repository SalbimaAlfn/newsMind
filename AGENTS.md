# AGENTS.md — NewsMind coding-agent rules

These instructions apply to every AI coding agent working in this repository.

## 1. Read before acting

Read these files before making a change:

1. `AGENTS.md` — how to work.
2. `PRD.md` — product requirements and architecture.
3. `TASK.md` — active phase and acceptance checks.
4. `README.md` — local setup and commands.

Then inspect the actual repository. Existing code is the source of truth for what has already been implemented. Do not assume that planned files, scripts, deployments or integrations already exist.

## 2. Project context

NewsMind is a single-owner personal news monitor.

- Frontend: React + TypeScript + Vite on Vercel Hobby.
- Backend: TypeScript Cloudflare Worker.
- Database: Cloudflare D1.
- Scheduler: Cloudflare Cron, hourly (`0 * * * *`, UTC).
- Ingestion: RSS/Atom feeds; no browser scraping in v1.
- AI: optional free-tier online API only; Gemini is a candidate pending current terms/quota review.
- Notifications: opt-in Web Push.
- Target cost: $0/month.
- Development: Windows 11 PowerShell, Node 24.x/npm; machine has 4 GB RAM and no dedicated GPU.

The laptop is not a production dependency. Do not build a design that needs it online after deployment.

## 3. Phase discipline — do not jump ahead

The active phase is recorded in `TASK.md`. Work only on that phase.

- Phase 1: local RSS ingestion preview.
- Do not add D1, Cron, AI, dashboard, auth, Web Push or deployment work during Phase 1 unless the owner explicitly changes the phase.
- Finish the current acceptance checks before beginning the next phase.
- Do not scaffold every future subsystem “for later”.
- If the user asks for a change, update the plan only where that request affects it; do not rewrite unrelated scope.
- If a decision is blocking, state the exact decision and present the smallest reasonable options. Do not ask questions already answered in the documents.

## 4. Caveman communication protocol — token efficiency

Use a compact, direct communication style. This is an efficiency rule, not an instruction to write broken or childish prose.

- Start with the result or blocker. Skip greetings and long preambles.
- Prefer short sentences and specific bullets.
- Do not repeat the user's request or restate the whole project context each turn.
- Do not narrate obvious actions or provide a tutorial unless requested.
- Do not dump files or entire diffs unless requested; summarize changed files and important decisions.
- Ask one focused question only when genuinely blocked.
- Use existing conversation/repository context. Never make the owner repeat known choices.
- Explain risks and trade-offs when they affect a decision; brevity must not hide uncertainty.
- Preserve enough detail for correctness, security and handoff. Token savings never justify omitting required behavior or tests.

## 5. Ponytail — full intensity

Apply the Ponytail decision ladder to every code/design task:

1. Does this feature or code need to exist now? Skip speculative work.
2. Does the repository already contain a usable implementation? Reuse it.
3. Can the language standard library solve it?
4. Can a native platform/browser/Cloudflare feature solve it?
5. Can an installed dependency solve it? Do not add another package for the same job.
6. Choose the smallest clear implementation that fully meets the requirement.

Rules:

- Read and understand the code path before editing.
- Prefer deletion and reuse over adding layers.
- No speculative interfaces, factories, registries, plugin systems or abstractions with one implementation.
- No new dependency unless it solves a real current requirement that built-in APIs do not reasonably cover. State why it is needed.
- No ORM, Redis, Docker, queue, vector database, agent framework, browser automation or local LLM for v1 without a new requirement and owner approval.
- No generic “enterprise-ready” scaffolding.
- Keep the fewest files that preserve clear responsibilities.
- Fix root causes, not symptoms.
- Do not remove input validation, error handling, accessibility or security to reduce line count.
- Mark deliberate shortcuts that have a known limitation with a concise `ponytail:` comment and state when they must be revisited.
- For non-trivial parser, loop, branch, storage or security logic, leave one runnable check/test that catches a regression.
- Do not refactor unrelated code during a feature task.

## 6. Design quality — no AI slop

Build a useful editorial tool, not a generic AI SaaS template.

### Visual principles

- Use a restrained neutral palette and one purposeful accent.
- Use clear typography, consistent spacing and readable information density.
- Make headlines, publisher, time, topic and source link the visual priority.
- Prefer editorial lists/rows and subtle separators over a grid of identical cards.
- Desktop can use a compact side navigation and a readable article column; mobile becomes one column.
- Use real article and status data only.
- Provide designed empty, loading, offline, permission-denied and error states.
- Use semantic HTML, keyboard navigation, visible focus and adequate contrast.
- Respect reduced-motion settings.

### Explicitly avoid

- Gradient blobs, glow effects, glassmorphism and random floating shapes.
- Giant hero sections or marketing copy inside the dashboard.
- Fake charts, fake counts, fake article feeds, fake avatars or fake activity.
- Excessive rounded cards, badges, icons, shadows and animations.
- Generic “unlock insights with AI” copy or decorative AI branding.
- A UI library or chart library unless a real need appears.

The interface should look intentionally designed for reading and managing news. Do not use design decoration to hide missing functionality.

## 7. Implementation rules

### TypeScript and Cloudflare Worker

- Use the platform's native `Request`, `Response`, `fetch`, `URL` and Web Crypto APIs where practical.
- Keep API routes small and explicit. Do not add a routing framework for a handful of routes.
- Validate all external input: query parameters, JSON bodies, feed URLs, article URLs and AI responses.
- RSS/Atom parser must handle one item and multiple items, missing optional fields, malformed XML and both RSS and Atom shapes.
- A single failed feed must not prevent other feeds from being reported.
- Bound network requests with timeouts; bound feed bytes and entries; keep concurrency low.
- Revalidate redirects and reject local/private destinations for user-added sources.
- Use parameterized D1 statements. Never concatenate untrusted values into SQL.
- Use migrations. Never edit deployed D1 schema manually without a migration.
- Make collection idempotent using database constraints, not only in-memory checks.
- Store UTC timestamps in one documented format.
- Keep Cron work small enough for the current Workers Free CPU limit; measure before scaling.

### React dashboard

- Use React + TypeScript + Vite only when the dashboard phase begins.
- Prefer semantic HTML and CSS over dependencies.
- Keep frontend API URL configuration public; never expose server keys in `VITE_*` variables.
- Never render RSS or AI content as trusted HTML. Render text safely.
- Use pagination; do not load all articles at once.
- Show honest errors and source timestamps. Do not fake “live” status.
- Avoid a global state library until actual shared state complexity requires one.

### Database

- Start with only tables justified by the PRD: `sources`, `articles`, `collection_runs`, `push_subscriptions`, `settings`.
- Add a new table only when it models a distinct persisted concept.
- Use unique constraints for article deduplication and indexes for actual list/search queries.
- Do not store secrets in D1.
- Keep saved articles during retention cleanup.

### AI

- AI remains disabled by default until the owner explicitly enables it.
- Recheck official free-tier pricing, rate limits and data-use terms at implementation time.
- Store provider keys only as Cloudflare Worker secrets.
- Never send full article bodies by default. Send limited feed metadata/excerpts only.
- Initial cap: max 5 articles per hourly run plus a server-side daily cap.
- Validate the returned JSON and numeric score ranges.
- Treat AI output as untrusted text; never execute it or render HTML from it.
- On quota exhaustion, disable/skip analysis and continue news collection.
- Never switch to a paid provider, paid model, paid grounding or billing plan automatically.
- Do not install LangChain, an agent framework, or a multi-provider abstraction for one provider.

### Web Push

- Use browser-native service worker and Push APIs.
- Select a maintained Cloudflare Workers-compatible VAPID/Web Push implementation only when this phase begins; verify compatibility before adding it.
- Keep VAPID private key and subscription material secret.
- Require explicit opt-in and provide unsubscribe.
- Do not send repeated alerts for duplicate articles.

## 8. Security and privacy are not optional

- Never commit `.env`, `.dev.vars`, API keys, passwords, VAPID private keys, session secrets or local database files.
- Never put secrets in frontend source or build variables.
- No public unauthenticated admin route. No public manual collect endpoint.
- Before public release, implement single-owner auth, restrictive CORS, CSRF protection appropriate to the session design and safe error responses.
- Do not use wildcard CORS with credentials.
- Do not allow arbitrary URL fetching without scheme/host/redirect validation.
- Sanitize/escape feed content by rendering as text.
- Do not scrape behind paywalls or bypass technical restrictions.
- Keep logs useful but secret-free.
- Do not deploy, change account billing or add a payment method unless explicitly authorized.

## 9. Testing and verification

After a change:

1. Run the smallest relevant test/check.
2. Run typecheck/build if configured and relevant.
3. For feed changes, test RSS 2.0, Atom, malformed feed, empty feed, HTTP failure, timeout and missing optional fields as applicable.
4. For storage changes, test migrations on a clean local D1 database and verify duplicate prevention.
5. For API/auth changes, test missing/invalid credentials, bad origin, malformed body and unauthorized admin operations.
6. For AI changes, test disabled state, quota error, invalid model output and successful structured output with mocked or permitted test data.
7. For UI changes, verify desktop and mobile layouts, keyboard access, empty/error states and real data rendering.
8. Report exactly which commands ran and their actual results. Never claim tests passed if they were not executed.

Keep tests proportionate. Prefer one focused test or runnable check over a large test framework for a tiny module. Add tooling only when the built-in test path is insufficient.

## 10. Cost and account safety

- Target $0/month.
- Cloudflare Workers Free + D1 Free and Vercel Hobby are the target tiers.
- Confirm current official limits before deployment; do not rely on old screenshots or remembered quotas.
- Workers Free has strict CPU/subrequest limits. Reduce workload before considering a different architecture.
- Vercel Hobby is for personal/non-commercial use. Vercel is not the hourly collector in this design.
- If a free quota is exhausted, pause/skip optional work and explain. Never auto-upgrade or route to paid service.
- Do not enable paid analytics, paid email, paid AI grounding/search, premium feed APIs or commercial add-ons.

## 11. Working with the owner

- Explain commands for Windows PowerShell, not Bash-only syntax.
- Use `D:\NewsMind` as the planned path unless the owner specifies another location.
- Give copy-paste commands with the working directory stated.
- Do not assume the owner has run a command; ask for output only after giving the exact command when a result is needed.
- Never ask the owner to repeat hardware, OS, preferred deployment, cadence or AI cost policy.
- If a feed is unreachable, report the exact source and error; don't call the whole project broken.
- Do not request API keys in chat. Explain how to store secrets through Cloudflare's secret interface/CLI.
- Never promise background work or future delivery. Finish the work possible in the current session.

## 12. Required handoff after each task

Use this compact format:

```text
Done:
- <verified result>

Changed:
- <file>: <purpose>

Checks:
- <command>: PASS / FAIL / NOT RUN (reason)

Next:
- <single next task from TASK.md>

Blocked:
- <only if something actually blocks progress>
```

Do not repeat the PRD or give a long feature tour. Update `TASK.md` only for completed, verified items.
