# JobPilot AI — Intelligent Job Hunting & Verification Engine

JobPilot AI is a full-stack, production-ready web application designed to help job seekers discover legitimate career opportunities, verify employer authenticity, match resumes against job requisitions, prepare tailored application materials, and track employer responses end-to-end.

---

## 🚀 Key Highlights & Capabilities

- **Web-First Job Discovery Engine (Dossier-Inspired, ₹0 Cost)**: Multi-source job discovery engine finding publicly accessible job vacancies across official company career boards, 11 public ATS platforms, and schema.org JobPosting feeds. **Zero paid API requirement and ₹0 operating cost**.
- **11 Public ATS Adapters**: Native, key-less public integrations for **Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Personio, Breezy HR, Teamtailor, Rippling, and Workday**.
- **Indian Tech Seed Discovery System**: Pre-seeded with 16 top Indian technology companies (Razorpay, Postman, CRED, Hasura, Urban Company, BrowserStack, MoEngage, Groww, Zepto, CleverTap, Shiprocket, Yellow.ai, HackerEarth, InMobi, UrbanPiper, Zerodha) with auto-crawling, ATS auto-detection, and manual company addition.
- **Central JobDiscoveryAgent**: Automatically parses the candidate's active profile, extracts preferred roles and skills, creates focused India queries, crawls due company career boards & public ATS feeds, filters by India-first relevancy, deduplicates across channels, and computes 6D match scores.
- **Monthly API Quota Guards & 24-Hour Query Caching**: Durably persisted in SQLite (`api_usage` and `query_cache` tables). Tracks monthly limits (200/month JSearch, 250/month Adzuna) and suppresses redundant external requests with 24-hour TTL caching.
- **Intelligent Dossier Match Evaluation**: Comprehensive 6-dimensional scoring enhanced with:
  - **Fresher Eligibility Badge**: Instantly identifies entry-level/fresher roles (`0 yrs experience`).
  - **Natural Language Experience Explanation**: Explains why the candidate's years align or diverge from requisition requirements.
  - **Location Compatibility Note**: Highlights compatibility with candidate-preferred Indian hubs (Bengaluru, Hyderabad, Pune, Chennai, Mumbai, Delhi NCR) or India-eligible remote arrangements.
  - **Missing Skills & Strong Matches**: Clear color-coded badges to guide candidate preparation.
- **Authenticity & Scam Detection**: Transparent multi-point audits checking company domains, recruiting patterns, absence of advance fees/charges, and legitimate ATS destinations to protect job seekers from employment scams.
- **Guided Application Assistant**: 4-step streamlined preparation workflow generating grounded tailored cover letters, recruiter pitches, custom resume bullet points, and interview screening checklists.
- **Interactive Kanban & List Tracker**: Track job applications across their complete lifecycle (`Saved`, `Preparing`, `Ready to Apply`, `Applied`, `Assessment`, `Interview`, `Offer`, `Rejected`).
- **Recruiter Response Inbox & Parser**: Ingest and analyze recruiter communications to automatically infer interview invites, assessments, offers, or rejections, recommending 1-click application status updates.
- **Startup Jobs Discovery**: Dedicated portal filtering by funding stage (Pre-seed, Seed, Series A, Series B+, Bootstrapped), tech stack, paid internships, and equity disclosures.
- **Resume Extraction & Profile Manager**: Upload PDF or text resumes to automatically extract structured contact details, skills, experience, and education with full editing capabilities.
- **Data Ingestion & Deduplication**: Upload custom CSV/JSON datasets with automatic company, title, and URL deduplication.
- **Export & Portability**: 1-click export of complete candidate profile, tracked applications, and job listings as JSON or CSV.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    JobPilot AI (React SPA)                  │
│  - Dashboard & KPIs          - AI Application Assistant     │
│  - Multi-Source Discovery    - Response Inbox & Parser      │
│  - Startup Jobs Ecosystem    - Resume & Profile Manager     │
│  - Kanban Application Tracker- Ingestion & Deduplication    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Client-Server Bridge
┌──────────────────────────────▼──────────────────────────────┐
│                  Express Server (server.ts)                 │
│  - Job Normalization & Deduplication Pipeline               │
│  - Endpoints for Jobs, Applications & Candidate Profile     │
│  - Source Connectors (Naukri, LinkedIn, Internshala, etc.)  │
│  - Secure File & Resume Processor                           │
│  - Data Export Engine (JSON / CSV)                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ AI Intelligence Engine
┌──────────────────────────────▼──────────────────────────────┐
│             Google Gemini (gemini-3.8-flash)                │
│  - Resume Document & PDF Extraction                         │
│  - 6-Dimensional Semantic Resume Match Scoring              │
│  - Scam Detection & Authenticity Auditing                   │
│  - Tailored Cover Letter & Recruiter Pitch Generation       │
│  - Recruiter Email Parsing & Lifecycle State Inference     │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion |
| **Build & Tooling** | Vite, TSX, PostCSS, Autoprefixer |
| **Backend & Server** | Node.js, Express, TypeScript |
| **Intelligence** | Google Gemini 3.8 Flash (`@google/genai`) with offline fallback support |
| **Storage & Data** | Persistent SQLite (`data/jobpilot.db`) with WAL mode, foreign keys & JSON/CSV exports |

---

## 📁 Project Structure

```
ai-job-hunt/
├── data/                          # SQLite persistent database directory
│   └── jobpilot.db               # Local SQLite database (git-ignored)
├── server/
│   ├── database.ts               # SQLite connection, migrations (001, 002) & typed repositories
│   ├── matching.ts               # 6D deterministic match evaluator
│   └── job-sources/              # Phase 3 modular ingestion architecture
│       ├── types.ts              # Common adapter contracts, raw records & runs
│       ├── normalizer.ts         # Standard schema mapper & URL sanitizer
│       ├── deduplicator.ts       # Cross-source deduplication & discipline guardrails
│       ├── registry.ts           # Central source adapter registry & tester
│       ├── scheduler.ts          # Ingestion service, concurrency lock & cron scheduler
│       └── sources/              # Specialized source connectors
│           ├── base-adapter.ts   # Abstract adapter with exponential retry backoff
│           ├── career-pages.ts   # Active corporate career & syndication feed
│           ├── naukri-adapter.ts # Naukri Enterprise RMS Partner adapter
│           ├── linkedin-adapter.ts # LinkedIn Talent Solutions / RSC adapter
│           ├── internshala-adapter.ts # Internshala Recruiter feed adapter
│           └── foundit-adapter.ts # Foundit (Monster) Recruiter API adapter
├── src/
│   ├── api/
│   │   └── client.ts              # Frontend client for backend services
│   ├── components/
│   │   ├── ApplicationAssistantModal.tsx  # 4-step tailored prep workflow
│   │   ├── ApplicationTrackerView.tsx    # Kanban & List application tracking
│   │   ├── DashboardView.tsx             # Analytics, quick actions, KPI cards
│   │   ├── JobDetailsModal.tsx           # Requisition view & audit breakdown
│   │   ├── JobDiscoveryView.tsx          # Multi-filter search & match scoring
│   │   ├── Navbar.tsx                    # Navigation & notifications bar
│   │   ├── NotificationsModal.tsx        # System notifications & alerts
│   │   ├── ResponseInboxView.tsx         # Recruiter email analyzer & logger
│   │   ├── ResumeProfileView.tsx         # Resume parsing & profile editor
│   │   ├── SourcesIngestionView.tsx      # CSV/JSON ingestion & deduplication
│   │   └── StartupJobsView.tsx           # Curated startup jobs directory
│   ├── types/                     # TypeScript type definitions
│   │   ├── application.ts
│   │   ├── candidate.ts
│   │   ├── connector.ts
│   │   └── job.ts
│   ├── App.tsx                    # Main app layout and routing
│   ├── index.css                  # Global styles & Tailwind entry
│   └── main.tsx                   # React root mount
├── server.ts                      # Express backend & AI processing pipeline
├── test_inprocess.ts              # 14-test in-process SQLite persistence regression suite
├── test_process_restart.ts        # Critical process restart lifecycle test
├── package.json                   # Dependencies & build scripts
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite bundler configuration
```

---

## 🛠️ Setup & Running Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (comes with Node.js) or **pnpm**

---

### Step 1: Install Dependencies
Before running the application, install the project dependencies (this installs `tsx`, Vite, React 19, Express, and required types):
```bash
npm install
```

> **Note for Windows users**: If you previously saw `'tsx' is not recognized as an internal or external command`, running `npm install` ensures `tsx` is installed inside `node_modules/.bin`.

---

### Step 2: Configure Environment
Create your `.env` configuration file from the template:

**On Linux / macOS / Git Bash:**
```bash
cp .env.example .env
```

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

*(Optional)* Add your Google Gemini API Key in `.env` if you'd like to enable live AI parsing, 6D resume matching, and tailored pitch generation. The application includes built-in deterministic fallbacks if running without an API key.

---

### Step 3: Start Development Server
Launch the full-stack development server:
```bash
npm run dev
```

This starts the unified Express backend and Vite frontend with hot-module reloading (HMR).
Once started, open your browser and navigate to:
```
http://localhost:3000
```

---

### Step 4: Build & Run in Production (Optional)
To test or deploy the production build:
```bash
# 1. Compile frontend assets into /dist
npm run build

# 2. Launch production server
npm start
```

---

### 💡 Common Commands & Scripts

| Command | Description |
|---|---|
| `npm install` | Installs all required dependencies |
| `npm run dev` | Runs the full-stack app in development mode at `http://localhost:3000` |
| `npm run build` | Compiles the production bundle via Vite into `dist/` |
| `npm start` | Runs the production Express server serving pre-built assets |
| `npm run lint` | Runs TypeScript type checking without emitting files |
| `npm test` | Runs the 14-test SQLite persistence regression suite |
| `npm run test:restart` | Runs the critical process restart lifecycle persistence test |
| `npm run test:discovery` | Runs the 17-test Phase 3 real discovery & deduplication engine suite |
| `npm run test:dossier` | Runs the 8-test Dossier architecture discovery & quota suite |

---

### ❓ Troubleshooting

- **`'tsx' is not recognized`**:
  Make sure you ran `npm install` in the project root first. If running outside `npm scripts`, you can use `npx tsx server.ts`.
- **Port 3000 already in use**:
  Set a custom port in `.env` (e.g., `PORT=3001`), or pass `PORT=3001 npm run dev`.

---

## 🛡️ Authenticity Verification & Safety Standards

JobPilot AI enforces strict verification standards to protect candidates from malicious postings:
- **Corporate Domain Verification**: Validates employer domain legitimacy and cross-references public contact records.
- **No-Fee Guarantee**: Detects advance fee solicitations, "mandatory training charges", and paid assessment scams.
- **Verified ATS Redirects**: Confirms that application links route to trusted applicant tracking systems (e.g., Workday, Greenhouse, Lever, Ashby, SmartRecruiters).
- **Communication Audits**: Flags discrepancies between recruiter email domains and official company domains.

---

## 📄 License & Attribution

This project is licensed under the MIT License. Built with modern full-stack TypeScript and React.
