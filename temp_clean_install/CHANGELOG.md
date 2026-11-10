# Changelog

All notable changes to **JobPilot AI** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

