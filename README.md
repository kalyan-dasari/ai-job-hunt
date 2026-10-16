# JobPilot AI — AI-Powered Job Hunting Agent & Verification Engine

JobPilot AI is a production-grade, full-stack web application designed to help candidates discover legitimate job opportunities, verify employer authenticity, match resumes against job requisitions, prepare tailored application materials, and track employer responses end-to-end.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    JobPilot AI (React SPA)                  │
│  - Dashboard & KPIs          - AI Application Assistant     │
│  - Multi-Source Discovery    - Response Inbox & Parser      │
│  - Startup Jobs Ecosystem    - Resume & Profile Manager     │
│  - Kanban Application Tracker- Ingestion & Deduplication    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│                  Express Server (server.ts)                 │
│  - Job Normalization & Deduplication Pipeline               │
│  - RESTful Data Endpoints (/api/jobs, /api/applications)    │
│  - Source Connectors (Naukri, LinkedIn, Internshala, etc.)  │
│  - Secure File & Resume Processor                           │
│  - Data Export Engine (JSON / CSV)                          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Server-Side SDK
┌──────────────────────────────▼──────────────────────────────┐
│             Google Gemini API (gemini-3.8-flash)            │
│  - Resume Document & PDF Extraction                         │
│  - 6-Dimensional Semantic Resume Match Scoring              │
│  - Scam Detection & Authenticity Auditing                   │
│  - Tailored Cover Letter & Recruiter Pitch Generation       │
│  - Untrusted Recruiter Email Parsing & State Inference     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Features & What Works Now

| Feature | Status | Implementation Details |
|---|---|---|
| **Resume Extraction & Profile Editing** | **Active & Working** | Accepts PDF (base64) or plain text. Gemini extracts structured contact info, categorized skills, experience, education, and projects without inventing facts. User can review, edit, and add skills. |
| **Authenticity & Scam Detection** | **Active & Working** | Transparent multi-point audit: corroboration with official corporate domains, absence of advance fees/training charges, legitimate ATS destination, and recruiter domain consistency. Flags scams (e.g. data-entry advance fee schemes) with critical warnings. |
| **6-Dimension AI Resume Matcher** | **Active & Working** | Assesses Technical Skills, Relevant Experience, Project Relevance, Education & Certifications, Location/Arrangement, and Seniority Alignment. Returns 0-100 score, breakdown, strong matches, and missing skill advice. |
| **Dedicated Startup Jobs Section** | **Active & Working** | Filter by stage (Pre-seed, Seed, Series A, Series B+, Bootstrapped), tech stack, paid internships, and equity disclosures. |
| **Application Tracker** | **Active & Working** | Kanban Board and detailed List views across lifecycle stages (`Saved`, `Preparing`, `Ready to Apply`, `Applied`, `Assessment`, `Interview`, `Offer`, `Rejected`). Prevents marking submissions as confirmed without explicit candidate evidence. |
| **AI Application Assistant** | **Active & Working** | Guided 4-step prep flow: (1) Requisition audit, (2) Grounded tailored cover letter, recruiter pitch, and resume bullets, (3) Common screening Q&A & checklist, (4) Approved submission flow with official portal link and confirmation code recorder. |
| **Response Inbox & Recruiter Email Parser** | **Active & Working** | Treats incoming emails as untrusted text. Detects assessment requests, interview invitations, offers, or rejections. Maps message to tracked application and recommends 1-click status transitions. |
| **Dataset Ingestion & Deduplication** | **Active & Working** | Ingest custom CSV or JSON datasets. Deduplication engine checks normalized company, title, and URL identifiers to prevent duplicate listings. |
| **Live vs Demo Mode** | **Active & Working** | Instant toggle between curated demo data and live feeds. Clearly labeled banners to maintain data integrity. |
| **Data Export** | **Active & Working** | 1-click export of complete candidate profile, tracked applications, and job catalog as JSON or CSV. |

---

## 3. Features Requiring Future External API Credentials

- **Direct Gmail OAuth Ingestion**: Ready for Google Workspace OAuth integration to automatically poll a candidate's inbox for recruiter emails.
- **Direct LinkedIn / Naukri ATS Partner APIs**: Currently configured in compliant public ingestion & feed mode. Partner API credentials can be plugged directly into `/src/types/connector.ts` and `server.ts`.

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js 18+
- npm or pnpm
- Google Gemini API Key

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY in .env

# 3. Start development server (Full-stack with Vite HMR)
npm run dev

# 4. Build for production
npm run build

# 5. Start production server
npm start
```
The application will be live at `http://localhost:3000`.

---

## 5. Exporting and Developing Outside Google AI Studio

1. **Self-Contained Codebase**: The project is structured with standard Vite, React 19, TypeScript, Express, and `@google/genai`.
2. **Backend Storage**: The in-memory store in `server.ts` is modular and designed for drop-in migration to PostgreSQL (via Drizzle ORM / Prisma) or Firebase Firestore.
3. **Containerization**: A standard Dockerfile can be added with `node:20-alpine`, running `npm run build` and `npm start`.
