# JobPilot AI — Intelligent Job Hunting & Verification Engine

JobPilot AI is a full-stack, production-ready web application designed to help job seekers discover legitimate career opportunities, verify employer authenticity, match resumes against job requisitions, prepare tailored application materials, and track employer responses end-to-end.

---

## 🚀 Key Highlights & Capabilities

- **Authenticity & Scam Detection**: Transparent multi-point audits checking company domains, recruiting patterns, absence of advance fees/charges, and legitimate ATS destinations to protect job seekers from employment scams.
- **6-Dimensional AI Resume Matcher**: Evaluates Technical Skills, Relevant Experience, Project Relevance, Education & Certifications, Location/Arrangement, and Seniority Alignment to generate actionable match percentages and missing skill recommendations.
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
| **Storage & Data** | In-memory modular store with JSON/CSV export and database-ready interfaces |

---

## 📁 Project Structure

```
ai-job-hunt/
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
├── package.json                   # Dependencies & build scripts
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite bundler configuration
```

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file from the example:
```bash
cp .env.example .env
```
*(Optional)* Add your `GEMINI_API_KEY` in `.env` to enable full AI parsing, matching, and assistant features (graceful fallbacks are built-in if running without a key).

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000` with hot-module reloading.

### 4. Build for Production
```bash
npm run build
npm start
```

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
