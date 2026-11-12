# Changelog

All notable changes to **JobPilot AI** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-11-12

### Added
- **Unified Candidate Profile & Preference Center**:
  - Integrated candidate profile review and editing directly inside Resume Workspace (`ResumeWorkspaceView.tsx`).
  - Added interactive preference controls for Target Roles, Target Locations, Experience Level tiers (`Fresher 0–1 yr`, `Junior 1–3 yrs`, `Mid 3–5 yrs`, `Senior 5+ yrs`), and numeric ranges.
  - Profile saves immediately commit to SQLite and trigger automated match score recalculation across all catalog jobs.
- **Offline & Deterministic Local Resume Parser**:
  - Engineered local regex and segmentation heuristic resume parser (`server/local-resume-parser.ts`) extracting skills, work experience, projects, education, contact info, and experience tiers with zero paid LLM dependency.
- **High-Yield Public Source Expansion (+189 New Openings)**:
  - Added and verified 8 major public ATS company boards: Meesho (Lever), Zeta (Lever), Pocket FM (Lever), Supabase (Ashby), GitLab (Greenhouse), Elastic (Greenhouse), Datadog (Greenhouse), and Thoughtworks (Greenhouse).
  - Expanded total catalog from 447 to **636 unique jobs** with ₹0 operating cost.
  - Deactivated obsolete test fixtures and sources that migrated off public ATS endpoints.
- **Enhanced Daily Experience & Filtering**:
  - Added Daily Discovery Status Bar in Discover View showing last scan time, next scheduled run, openings in latest scan, and operational source health count ($26/26$ active, $0$ errors).
  - Added "Run Discovery Now" manual button with live progress spinner and instant feedback notification.
  - Added "New Since Last Scan" quick filter pill and granular experience tier filters (`Fresher 0–1 yr`, `Junior 1–3 yrs`, `Mid 3–5 yrs`, `Senior 5+ yrs`).

### Changed
- Refined default relevance sorting algorithm to boost newly discovered openings, matching candidate target roles, and matching candidate target locations.
- Reconciled experience metrics: 33 Fresher-Friendly, 449 Experienced, 154 Unclear = exactly 636 total jobs.

---

## [1.1.0] - 2026-11-12

### Added
- **Automated Daily Discovery Scheduler**:
  - Persistent background scheduler in Node.js running every 24 hours at 07:00 IST.
  - Startup catch-up discovery execution for runs older than 24 hours.
  - Scheduler state persistence and recovery in SQLite (`scheduler_state` table).
- **Daily Discoveries & Temporal Tracking**:
  - Tracking of `first_seen_at`, `last_seen_at`, `posted_at`, and `closed_at` on all job records.
  - Automatic vacancy closure detection for delisted requisitions.
  - Daily Discoveries dashboard with KPI metrics and timeframe filtering.

---

## [1.0.0] - 2026-11-10

### Added
- **Web-First Public Discovery Engine**:
  - Direct integration with 11 ATS platforms: Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, Personio, Breezy, Teamtailor, Rippling, and Workday.
  - Automated career-page discovery crawling official company websites.
  - Schema.org `JobPosting` JSON-LD microdata and RSS/Atom feed extraction.
  - 32 pre-configured verified Indian tech company sources across Hyderabad, Bengaluru, Chennai, and Pune hubs.
  - ₹0 operating cost: no paid APIs, no credits, no third-party proxies required.
- **SQLite Persistence & Integrity**:
  - Native `node:sqlite` storage with WAL mode, foreign keys, and atomic transactions.
  - 7 automated schema migrations with migration version tracking.
  - Zero mock data in production: all 277 discovered jobs verified from public career boards.
- **Intelligent 6-Dimensional Matching**:
  - Candidate profile matching considering technical skills, role, experience, fresher eligibility, location, and salary.
  - Mutually exclusive experience classification: Fresher-friendly (0–2 yrs), Experienced (3+ yrs), and Unclear.
  - 11-category India-first geographic classification.
  - Truthful salary disclosure: never invents undisclosed salary.
- **Comprehensive Application Assistant**:
  - Multi-version Resume Manager with local PDF text extraction via `pdf-parse` and deterministic/AI parsing.
  - Role-specific resume tailoring with missing keywords and bullet improvements.
  - Job-specific cover letter and pitch generator.
  - Application lifecycle pipeline (Preparing, Ready to Apply, Applied, Assessment, Interview, Offer, Rejected).
  - Direct employer link verification with manual application confirmation workflow.
- **Polished SaaS User Interface**:
  - Dashboard with discovery metrics, recent applications, and quick actions.
  - Full-featured Settings View with customizable role targets, salary expectations, preferred industries, and scheduler controls.
  - 1-click full database export in JSON and CSV formats.
  - Responsive dark-mode interface with mobile navigation support.
- **Production Readiness & Self-Hosting**:
  - Multi-stage `Dockerfile` based on Node 22 Alpine with persistent volume mounts.
  - `docker-compose.yml` for single-command self-hosting.
  - Built-in HTTP security headers, sliding-window rate limiting, and input validation.
  - Graceful shutdown handling (`SIGINT`, `SIGTERM`) with clean SQLite and scheduler teardown.
  - Root `/health` and `/api/health` endpoints.

