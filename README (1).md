# NewsMind

A personal RSS/Atom news monitor with optional AI analysis, a web dashboard and opt-in browser/phone notifications.

**Deployment:** Vercel frontend + Cloudflare Worker backend + Cloudflare D1  
**Collection:** hourly via Cloudflare Cron (`0 * * * *`, UTC)  
**AI:** optional free-tier API only; no paid fallback  
**Target cost:** $0/month  
**Current status:** specifications are ready; implementation has not yet been verified.

## 1. Read these documents first

- [`AGENTS.md`](./AGENTS.md) — rules for an AI coding agent.
- [`PRD.md`](./PRD.md) — product behavior, architecture, security and acceptance criteria.
- [`TASK.md`](./TASK.md) — phased checklist; Phase 1 is active.

Do not implement all phases at once. Complete and verify the active phase before continuing.

## 2. What the project does

1. Cloudflare fetches enabled RSS/Atom feeds hourly.
2. Articles are validated, normalized, deduplicated and stored in D1.
3. Rule-based topics/keywords filter relevant articles.
4. Optional free-tier AI analyzes a limited number of selected articles.
5. Vercel hosts the responsive React dashboard.
6. Web Push sends opt-in alerts for important new stories.

The owner's laptop is only used for development. Once deployed, collection continues while the laptop is sleeping or shut down.

## 3. Technology choices

| Part | Technology |
|---|---|
| Local development | Windows 11 PowerShell, Node.js 24.x, npm |
| Frontend | React + TypeScript + Vite |
| Frontend hosting | Vercel Hobby (personal use) |
| Backend/API | Cloudflare Worker + TypeScript |
| Scheduler | Cloudflare Cron Trigger |
| Database | Cloudflare D1 |
| RSS/Atom XML | `fast-xml-parser` |
| AI candidate | Gemini Developer API free tier, only after current terms/quota review |
| Notifications | Browser Push API + service worker + VAPID |

No Python runtime, local LLM, Docker, browser automation, Redis, ORM, LangChain or multi-agent framework is required by the selected design.

## 4. Hardware constraints

Development machine: Acer Aspire A314-22, Ryzen 3, 4 GB RAM, no dedicated GPU, Windows 11 Pro.

Keep local development light:

- Run one dev server at a time where practical.
- Avoid Docker and local model runtimes.
- Avoid browser automation and headless Chromium.
- Keep npm dependencies limited.
- Do not run the production collector from the laptop.

Previously reported environment: Node.js 24.x and npm 12.x. Verify current versions before setup:

```powershell
node --version
npm --version
```

## 5. Repository layout

Create only the folders needed for the current phase. Target layout:

```text
NewsMind/
├── AGENTS.md
├── PRD.md
├── README.md
├── TASK.md
├── apps/
│   ├── worker/
│   │   ├── src/
│   │   ├── migrations/
│   │   ├── package.json
│   │   └── wrangler.jsonc
│   └── dashboard/
│       ├── public/
│       ├── src/
│       └── package.json
└── .gitignore
```

The Worker and dashboard are independent npm projects. Do not add Turborepo, Nx or npm workspaces unless an actual dependency-sharing need appears.

## 6. Windows 11 setup — Phase 1

Open PowerShell. These commands create the repository and scaffold the Worker locally. They do not deploy anything or request payment information.

```powershell
New-Item -ItemType Directory -Force D:\NewsMind\apps | Out-Null
Set-Location D:\NewsMind
```

Put the four project documents in `D:\NewsMind`.

Scaffold the Cloudflare Worker:

```powershell
npm create cloudflare@latest -- apps/worker
```

When prompted, choose:

| Prompt | Choice |
|---|---|
| Starter/template | Hello World / Worker only |
| Language | TypeScript |
| Git initialization | No (unless you want Git now) |
| Deploy now | No |

Then install the one parser dependency:

```powershell
Set-Location D:\NewsMind\apps\worker
npm install fast-xml-parser
```

Start the local Worker:

```powershell
npx wrangler dev
```

The default local URL is normally `http://localhost:8787`.

Open these test routes:

```text
http://localhost:8787/health
http://localhost:8787/preview?only=bbc-news
http://localhost:8787/preview?only=bbc-tech
http://localhost:8787/preview?only=arxiv-ai
http://localhost:8787/preview?only=google-news-ai
http://localhost:8787/preview
```

Expected outcomes:

- `/health` returns HTTP 200 JSON with `ok: true`.
- `/preview` returns one result per configured feed.
- A successful feed includes article title, source URL, date and feed-provided summary/excerpt.
- A failed/empty feed reports its own status without hiding other feed results.

Stop the dev server with `Ctrl+C`.

**Important:** These routes are a local development preview, not a production API. Do not deploy the preview endpoint publicly before authentication, rate limits and input validation are implemented.

### Starter feed URLs

These are candidate source URLs. Test them during Phase 1; feed availability and formats can change.

| Source ID | URL |
|---|---|
| `bbc-news` | `https://feeds.bbci.co.uk/news/rss.xml` |
| `bbc-tech` | `https://feeds.bbci.co.uk/news/technology/rss.xml` |
| `arxiv-ai` | `https://rss.arxiv.org/rss/cs.AI` |
| `google-news-ai` | `https://news.google.com/rss/search?q=artificial+intelligence&hl=en-US&gl=US&ceid=US:en` |

Google News RSS is an optional, undocumented feed endpoint, not a guaranteed official API. Keep it replaceable. Add other publisher feeds only after checking their official feed page and terms.

## 7. Later development commands

Create the dashboard only when the task board reaches the dashboard phase:

```powershell
Set-Location D:\NewsMind
npm create vite@latest apps/dashboard -- --template react-ts
Set-Location D:\NewsMind\apps\dashboard
npm install
npm run dev
```

Common Worker commands (run from `apps/worker`):

```powershell
npx wrangler dev
npm run typecheck
npm test
npx wrangler d1 migrations apply <DATABASE_NAME> --local
```

Only add scripts that exist in `package.json`. Do not claim a test command passed if the project has no such script.

Dashboard commands (run from `apps/dashboard`):

```powershell
npm run dev
npm run build
npm run preview
```

## 8. Environment variables and secrets

Do not create AI keys or production secrets during Phase 1.

Later, keep the following server-side only:

| Name | Location | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Cloudflare Worker secret | Optional free-tier AI calls |
| `VAPID_PUBLIC_KEY` | Worker config/public frontend config | Push subscription public key |
| `VAPID_PRIVATE_KEY` | Cloudflare Worker secret | Signs push messages; never expose |
| `SESSION_SECRET` | Cloudflare Worker secret | Session signing if chosen auth design requires it |
| `DASHBOARD_ORIGIN` | Worker environment variable | Allowed dashboard origin |

Use Cloudflare secrets for sensitive values, not frontend `VITE_*` variables. Keep `.dev.vars`, `.env`, `*.db`, private keys and local secrets in `.gitignore`.

The AI feature must remain disabled until the owner explicitly enables it after reviewing provider terms. Do not attach billing or configure paid fallback.

## 9. Deployment overview (later phase)

1. Deploy the Worker to Cloudflare only after local tests and owner approval.
2. Create one D1 database on the Cloudflare Free plan and apply SQL migrations.
3. Configure `0 * * * *` in the Worker's Cron Trigger configuration. Cloudflare Cron runs on UTC.
4. Verify a real scheduled run, D1 writes and free-tier usage.
5. Build and deploy `apps/dashboard` to Vercel Hobby for personal use.
6. Configure the dashboard API URL and exact allowed origin.
7. Implement authentication before making private data or admin routes public.
8. Add service worker and Web Push after dashboard/API security works.

Never use Vercel Cron for the production hourly collector in this design. Cloudflare owns the schedule. Vercel Hobby is used only for the dashboard.

## 10. Cost safeguards

- Do not enter a payment method, enable a paid plan or accept an upgrade without explicit owner approval.
- No paid AI models, grounding/search charges or paid fallback.
- AI off by default; cap at 5 articles per hourly run initially and apply a daily cap.
- If free quota is exhausted or the provider becomes paid, skip AI and keep RSS ingestion working.
- Review current official pricing/limits before every deployment milestone.
- Cloudflare Free may reject work when daily limits are reached; handle the error instead of upgrading automatically.
- Vercel Hobby is restricted to personal, non-commercial use.

## 11. Troubleshooting

**`node` or `npm` is not recognized**  
Install/repair Node.js, reopen PowerShell and rerun the version checks.

**Cloudflare generator fails**  
Read the full error, verify Node/npm, then retry from `D:\NewsMind`. Do not install random global packages as a first fix.

**`wrangler dev` port is busy**  
Stop the older dev server with `Ctrl+C` or use Wrangler's supported local port option. Do not start multiple copies unnecessarily.

**RSS source returns HTTP error**  
Open the feed URL directly in a browser, verify the publisher still provides it, and report that source as unavailable. Do not treat one failed feed as a collector-wide failure.

**RSS parses zero items**  
Check whether the feed is RSS or Atom, inspect a small sanitized XML sample, and test parser handling. Do not assume the source has no news solely from an empty parser result.

**Worker exceeds CPU limit**  
Reduce source count, response size, entry count and parsing work; measure CPU before changing architecture. Never upgrade automatically.

## 12. Official references

Check these before implementation/deployment because limits and provider terms can change:

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Gemini API pricing and free-tier terms](https://ai.google.dev/gemini-api/docs/pricing)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cloudflare create-cloudflare](https://developers.cloudflare.com/workers/get-started/guide/)
- [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)
