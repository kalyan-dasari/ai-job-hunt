# JobPilot AI v1.0 — Web-First Intelligent Job Discovery & Application Engine

[![CI Pipeline](https://github.com/your-username/jobpilot-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/jobpilot-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker Ready](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://www.docker.com/)
[![Operating Cost](https://img.shields.io/badge/%E2%82%B90-Operating%20Cost-success.svg)](#zero-cost-philosophy)

**JobPilot AI** is a self-hostable, open-source job discovery and application management engine built for engineers and job seekers. Inspired by Dossier's clean, minimalist architecture, JobPilot AI automatically aggregates verified job vacancies across the public internet, deduplicates them, scores them against candidate profiles, prepares tailored application materials, and tracks applications through employer offers.

---

## 💡 Core Philosophy: ₹0 Operating Cost

- **Zero Paid APIs**: Discovers jobs directly through public career portals, 11 public Applicant Tracking Systems (ATS), and Schema.org `JobPosting` microdata feeds. No RapidAPI subscriptions, JSearch, or Adzuna paid accounts required.
- **Privacy-Preserving & Self-Hosted**: 100% of your data — candidate resume, notes, application history, and preferences — stays in your local SQLite database. No third-party tracking or telemetry.
- **Truthful & Authentic**: JobPilot AI never invents salaries, fabricates mock vacancies, or weakens fresher requirements. Undisclosed salary is always reported truthfully as undisclosed.
- **Deterministic Resilience**: Functions 100% locally with rule-based heuristics and local PDF parsing even when no LLM API key is configured.

---

## ⚡ Quickstart

### Prerequisites
- **Node.js**: `v22.0.0` or higher (utilizes native `node:sqlite`)
- **npm**: `v10.0.0` or higher

### 1. Local Setup

```bash
# Clone the repository
git clone https://github.com/your-username/jobpilot-ai.git
cd jobpilot-ai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the full-stack development server
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

### 2. Docker Setup (Single Command)

JobPilot AI includes a multi-stage `Dockerfile` and `docker-compose.yml` for turnkey containerized deployment:

```bash
# Build and run container with persistent volume
docker compose up -d

# Check service logs
docker compose logs -f

# Verify container healthcheck
curl http://localhost:3000/health
```

The container mounts `./data` to `/app/data` to ensure all SQLite records, migrations, and resume versions persist across restarts.

---

## 🌟 Key Features

### 1. Web-First Public Discovery Engine
- **11 Public ATS Adapters**: Built-in, key-less adapters for:
  - `Greenhouse`, `Lever`, `Ashby`, `Workable`, `SmartRecruiters`, `Recruitee`, `Personio`, `Breezy HR`, `Teamtailor`, `Rippling`, and `Workday`.
- **32 Pre-Configured Indian Tech Sources**: Pre-seeded with tech employers across **Bengaluru, Hyderabad, Chennai, and Pune** (including *Razorpay, Postman, CRED, Hasura, Urban Company, BrowserStack, Swiggy, Freshworks, Zenoti, HighRadius, Decisions, SigNoz, Slice, Mindtickle, Druva, Zerodha*, and more).
- **Automated Career Page Detector**: Crawls official company websites to auto-detect ATS providers, extract JSON-LD structured data, and parse RSS/Atom feeds.
- **Rate-Limited Background Scheduler**: Configurable automated discovery runs with exponential backoff and `robots.txt` compliance.

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
- **Customizable Preferences**: Configure target roles, preferred tech hubs, work arrangements (Remote/Hybrid/Onsite), employment types, experience bounds, and industry focus.
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
| `NODE_ENV` | `production` | Execution environment (`production` or `development`) |
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

# Production frontend bundle build
npm run build
```

---

## 🔒 Security & Privacy

- **Input Validation**: Strict file type (`application/pdf`, `text/plain`) and size checks (max 10MB) prevent denial of service and memory overflow.
- **SQL Injection Prevention**: All queries execute via SQLite prepared statements.
- **Built-in Rate Limiting**: In-memory sliding window rate limiter protects endpoints against request floods.
- **Standard Security Headers**: Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict `Content-Security-Policy`.
- **Zero Scraping of Authenticated Walls**: Complies with terms of service; does not bypass logins or scrape protected networks like LinkedIn or Naukri.

---

## ⚠️ Limitations & Disclaimers

1. **Employer Portal Changes**: Public career page HTML and ATS URL structures may change over time, requiring periodic adapter updates.
2. **Third-Party Rate Limits**: Some company websites may implement temporary rate limits if polled too aggressively. Use the built-in scheduler to space out discovery runs.
3. **Application Submissions**: JobPilot AI **does not** automatically submit applications to prevent candidate account bans and spam. The candidate is always directed to the employer's official page to review and submit directly.

---

## 📄 License

JobPilot AI is licensed under the [MIT License](LICENSE).
