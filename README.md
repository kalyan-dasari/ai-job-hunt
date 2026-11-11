# JobPilot AI v1.1 — Automated Daily Job Discovery & New Openings Feed

[![CI Pipeline](https://github.com/kalyan-dasari/ai-job-hunt/actions/workflows/ci.yml/badge.svg)](https://github.com/kalyan-dasari/ai-job-hunt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)
[![Operating Cost](https://img.shields.io/badge/%E2%82%B90-Operating%20Cost-success.svg)](#zero-cost-philosophy)

**JobPilot AI** is an open-source, web-first job discovery engine and application assistant designed for software engineers and technology professionals. Inspired by Dossier's clean, minimalist architecture, JobPilot AI aggregates verified public vacancies directly from official company career boards, 11 public Applicant Tracking Systems (ATS), and Schema.org feeds — without requiring paid aggregators, credits, or monthly API fees.

### What's New in v1.1
- **Automated Daily Discovery Scheduler**: Persistent background crawler running every 24 hours at 7:00 AM Asia/Kolkata (`07:00 IST`), configurable from Settings with startup catch-up execution.
- **Daily Discoveries & New Openings Feed**: Dedicated dashboard with KPI cards (Newly Discovered Today, Newly Posted Last 24h, Openings Last 7d, Recently Updated, Fresher-Friendly, Remote in India), customizable timeframe filters, and distinct "Newly Discovered" vs. "Recently Posted" badges.
- **Granular Source Monitoring Dashboard**: Real-time health metrics per company source (HTTP status, pages fetched, raw jobs, new openings, updated jobs, duplicates merged, closed listings, duration) with one-click "Run All Sources Now" and "Retry Failed Sources".
- **Temporal & Closure Integrity**: Strict mutual exclusion on experience, automated closure detection for filled vacancies, and immutable application tracking survival.

---

## 📸 Workspace Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  JOBPILOT AI               [Discover] [Tracker] [Resumes] [Sources] [⚙️]    │
├─────────────────────────────────────────────────────────────────────────────┤
│  🎯 Match Score: 94%   │ Razorpay — Backend Systems Engineer (Golang/Python)│
│  📍 Bengaluru, India   │ 🏷️ Fresher-Friendly (0-2 yrs)  │ ⚡ Active Listing │
│  💼 Hybrid Role        │ 💰 Undisclosed                │ 🔗 Greenhouse     │
│ ─────────────────────────────────────────────────────────────────────────── │
│  [Prepare Tailored Package]   [Open Official Portal ↗]   [Track Application]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 Core Philosophy: ₹0 Operating Cost

- **Zero Paid APIs**: Discovers jobs directly through public career portals, 11 public ATS platforms, and Schema.org `JobPosting` microdata feeds. No RapidAPI subscriptions, JSearch, or Adzuna paid accounts required.
- **Privacy-Preserving & Single-User Self-Hosted**: 100% of your data — candidate resume, notes, application history, and preferences — remains in your local SQLite database. No third-party tracking, analytics, or background telemetry.
- **Truthful & Authentic**: JobPilot AI never invents salaries, fabricates mock vacancies, or weakens fresher requirements. Undisclosed salary is always reported truthfully as undisclosed.
- **Deterministic Resilience**: Functions 100% locally with rule-based heuristics and local PDF parsing even when no LLM API key is configured.

---

## ⚡ Quickstart

### Prerequisites
- **Node.js**: `v22.0.0` or higher (utilizes native `node:sqlite`)
- **npm**: `v10.0.0` or higher
- **Git**

### 1. Local Setup

```bash
# Clone the repository
git clone https://github.com/kalyan-dasari/ai-job-hunt.git
cd ai-job-hunt

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the full-stack development server
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

### 2. Docker Self-Hosting (Single Command)

JobPilot AI includes a production-ready multi-stage `Dockerfile` and `docker-compose.yml`:

```bash
# Build and launch container in background
docker compose up -d

# Check live logs
docker compose logs -f

# Verify container healthcheck
curl http://localhost:3000/health
```

The container automatically mounts `./data` to `/app/data` to ensure all SQLite records, migrations, and resume versions persist permanently across restarts and image updates.

---

## 🔍 How Job Discovery Works

JobPilot AI coordinates discovery through the central **`JobDiscoveryAgent`**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Central JobDiscoveryAgent                  │
│                     (server/job-sources/agent.ts)               │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
       ┌───────▼────────┐         ┌───────▼────────┐
       │ 11 Public ATS  │         │ Career Crawler │
       │    Adapters    │         │  & JSON-LD/RSS │
       └───────┬────────┘         └───────┬────────┘
               │                          │
               └───────────┬──────────────┘
                           │
             ┌─────────────▼─────────────┐
             │ Deduplication & Normalizer│
             │  - India-first filtering  │
             │  - Fresher categorization │
             │  - Canonical link binding │
             └─────────────┬─────────────┘
                           │
             ┌─────────────▼─────────────┐
             │   SQLite Catalog Storage  │
             │     (data/jobpilot.db)    │
             └───────────────────────────┘
```

1. **Candidate Context**: Reads target roles, preferred tech hubs (Bengaluru, Hyderabad, Pune, Chennai, etc.), work arrangements, and skills from your profile.
2. **Direct ATS Querying**: Connects directly to employer endpoints across 11 ATS platforms.
3. **Career Page Microdata**: Parses Schema.org `JobPosting` JSON-LD from company career pages.
4. **Deduplication**: Eliminates cross-source duplicates using company name, normalized title, and canonical URLs.
5. **6D Match Evaluation**: Computes fit against technical skills, experience requirements, fresher eligibility, location compatibility, and salary expectations.

---

## 🌟 Key Features

### 1. Web-First Public Discovery Engine
- **11 Public ATS Adapters**: Built-in, key-less adapters for:
  - `Greenhouse`, `Lever`, `Ashby`, `Workable`, `SmartRecruiters`, `Recruitee`, `Personio`, `Breezy HR`, `Teamtailor`, `Rippling`, and `Workday`.
- **32 Pre-Configured Indian Tech Sources**: Pre-seeded with tech employers across **Bengaluru, Hyderabad, Chennai, and Pune** (including *Razorpay, Postman, CRED, Hasura, Urban Company, BrowserStack, Swiggy, Freshworks, Zenoti, HighRadius, Decisions, SigNoz, Slice, Mindtickle, Druva, Zerodha*, and more).
- **Automated Career Page Detector**: Crawls official company websites to auto-detect ATS providers, extract JSON-LD structured data, and parse RSS/Atom feeds.
- **Configurable Scheduler**: Automated discovery passes with exponential backoff and rate-limit preservation.

### 2. SQLite Persistence & Integrity
- **Native `node:sqlite` Storage**: Zero external database dependencies; runs on Node's native synchronous SQLite engine.
- **Full Migration Lifecycle**: 7 sequential migrations managing profiles, jobs, applications, and source health.
- **Mutually Exclusive Categorization**:
  - **Fresher-Friendly**: Explicitly 0–2 years experience, trainee, intern, or entry-level.
  - **Experienced**: Explicitly 3+ years experience or senior requirements.
  - **Unclear**: Non-disclosed or ambiguous experience requirements.
- **India-First Location Normalization**: Reconciled into 11 regional categories (Bengaluru, Hyderabad, Pune, Chennai, Mumbai, Delhi NCR, Other Indian Cities, Remote India, International, International Remote, and Unknown).

### 3. Intelligent 6-Dimensional Matching
- Evaluates **Technical Skills, Role Fit, Experience Level, Fresher Eligibility, Location & Remote Preference, and Published Salary**.
- **Truthful Compensation Evaluation**: Evaluates fit against candidate expectations when disclosed; never fabricates numbers when undisclosed.
- **Strict Fresher Protection**: Senior and staff positions are heavily penalized for fresher candidates, ensuring entry-level opportunities always rank first.

### 4. Application Assistant & Lifecycle Tracker
- **Multi-Version Resume Manager**: Upload PDF resumes with client-side text extraction via `pdf-parse`. Maintain multiple versions and designate an active resume.
- **Job-Specific Resume Tailoring**: Identifies missing keywords and suggests high-impact bullet point enhancements.
- **Grounded Cover Letter Generator**: Creates tailored pitches referencing real candidate achievements and specific job responsibilities.
- **Application Tracker**: Kanban and list views across 8 pipeline stages (`Preparing`, `Ready to Apply`, `Applied`, `Assessment`, `Interview`, `Offer`, `Rejected`, `Withdrawn`).
- **Original Source Workflow**: Direct 1-click links to the authentic employer portal, with manual confirmation before marking as applied.

### 5. Settings, Backups & Portability
- **Customizable Preferences**: Configure target roles, preferred tech hubs, work arrangements, experience boundaries, and industry focus.
- **Background Scheduler Controls**: Toggle automated crawls and adjust execution frequency (15m, 30m, 1h, 2h, 6h, 12h, 24h).
- **1-Click Full Backup**: Download your entire workspace data as structured **JSON** or spreadsheet-ready **CSV**.

---

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 JobPilot AI (React 19 SPA)                  │
│  - Dashboard & KPIs           - AI Application Assistant    │
│  - Multi-Source Discovery     - Resume & Profile Manager    │
│  - Kanban Application Tracker - Settings & Export Controls  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST APIs
┌──────────────────────────────▼──────────────────────────────┐
│             Node.js / Express Backend (server.ts)           │
│  - Security Headers (CSP, X-Frame, X-XSS) & Rate Limiting   │
│  - SQLite Database Sync (WAL Mode, Foreign Keys)            │
│  - Job Discovery Agent & Ingestion Scheduler                │
│  - 6D Intelligent Matching & Scoring Engine                 │
│  - 11 Public ATS Adapters + Career Page Web Crawler         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Direct HTTPS / No Middleman
┌──────────────────────────────▼──────────────────────────────┐
│                    Public Career Portals                    │
│  - Greenhouse, Lever, Ashby, Workable, SmartRecruiters      │
│  - Recruitee, Personio, Breezy, Teamtailor, Rippling        │
│  - Schema.org JobPosting Microdata & RSS Feeds              │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Environment Variables

Configuration is loaded from `.env` in the project root:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port for the web server |
| `NODE_ENV` | `development` | Execution environment (`development` or `production`) |
| `DATABASE_PATH` | `./data/jobpilot.db` | Filesystem location for persistent SQLite database |
| `GEMINI_API_KEY` | *(Optional)* | Google Gemini key for semantic resume parsing & AI generation |

*Note: JobPilot AI functions completely deterministically without `GEMINI_API_KEY`.*

---

## 🧪 Testing & Verification

JobPilot AI includes an isolated test suite verifying persistence, process restarts, public discovery, and security:

```bash
# Type check TypeScript codebase
npm run lint

# Run in-process SQLite persistence suite (14 tests)
npm test

# Run process restart test (verifies cross-process DB survival)
npm run test:restart

# Run web-first public discovery test suite (10 tests)
npm run test:public

# Run security, rate limiting & scheduler test suite (11 tests)
npm run test:security

# Production frontend bundle build
npm run build
```

---

## 🔒 Security & Privacy

- **Single-User Self-Hosted Model**: JobPilot AI is designed strictly for private, single-user self-hosting. There are no multi-tenant logins, public user accounts, or shared cloud databases.
- **Input Validation**: Strict file type (`application/pdf`, `text/plain`) and size checks (max 10MB) prevent denial of service and memory overflow.
- **SQL Injection Prevention**: All queries execute via SQLite prepared statements with parameter binding.
- **Built-in Rate Limiting**: In-memory sliding window rate limiter protects endpoints against request floods (180 req/min per IP).
- **Standard Security Headers**: Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, and strict `Content-Security-Policy`.
- **Zero Scraping of Authenticated Walls**: Complies with terms of service; does not bypass logins or scrape protected networks like LinkedIn or Naukri.

---

## ⚠️ Source Availability & Realistic Limitations

1. **Public Source Availability**: Public career pages and ATS endpoints are maintained by individual employers and may change or become temporarily unavailable without notice. If a company migrates to a different ATS provider, the crawler records the status and skips gracefully.
2. **Rate Limits & Cooldowns**: Certain career portals enforce request rate limits if queried repeatedly. The discovery engine includes built-in cooldowns and query caching to respect remote servers.
3. **Application Submissions**: JobPilot AI **does not** automatically submit applications to prevent candidate account bans and spam. The candidate is always directed to the employer's official page to review and submit directly.

---

## 🛠️ Troubleshooting

- **Node Version Error**: Ensure you are running Node.js 22.0.0 or higher (`node -v`). JobPilot AI relies on Node's native synchronous SQLite engine (`node:sqlite`).
- **Port 3000 Already In Use**: Set `PORT=3001` in your `.env` file or export it before running `npm start`.
- **Docker Permission Errors**: Ensure `./data` directory has read/write permissions for the `node` user (UID 1000).
- **404 on Specific Company**: Companies periodically change their career portal slugs (e.g., from Lever to Greenhouse). You can update the company's ATS slug directly in the Sources tab.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a pull request.

---

## 📄 License

JobPilot AI is licensed under the [MIT License](LICENSE).
