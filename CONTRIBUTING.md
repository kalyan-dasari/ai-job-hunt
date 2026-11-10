# Contributing to JobPilot AI

Thank you for your interest in contributing to **JobPilot AI**! We welcome bug reports, feature proposals, documentation improvements, and pull requests from developers of all skill levels.

---

## 🧭 Principles & Guidelines

1. **₹0 Operating Cost Core**: Core discovery, persistence, and matching must always work locally and without requiring paid APIs or subscriptions.
2. **Honesty & Data Integrity**: Never invent salaries, fake company locations, or create artificial mock listings. Undisclosed salary is always presented truthfully as undisclosed.
3. **Respect ATS Providers & Career Sites**: Use respectful HTTP patterns, rate limiting, and standard headers. Never scrape sites behind strict login walls or anti-bot protections like LinkedIn or Naukri.
4. **Deterministic Resilience**: When optional AI providers (like Gemini) are unavailable, the application must seamlessly fall back to deterministic parsing and scoring.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: v22.0.0 or later (required for native `node:sqlite` support)
- **npm**: v10.0.0 or later
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/jobpilot-ai.git
cd jobpilot-ai

# 2. Install dependencies
npm install

# 3. Copy the environment configuration
cp .env.example .env

# 4. Start the development server (Express backend + Vite HMR)
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 🧪 Testing Guidelines

Before submitting a pull request, ensure all test suites pass:

```bash
# Run TypeScript compilation check
npm run lint

# Run in-process SQLite persistence test suite
npm test

# Run process restart lifecycle test
npm run test:restart

# Run public web-first discovery test suite
npm run test:public

# Build frontend production bundle
npm run build
```

---

## 📁 Repository Structure

```
├── data/                     # Persistent SQLite databases (ignored in git)
├── server/                   # Backend services & database layer
│   ├── database.ts           # SQLite migrations, schemas & repositories
│   ├── matching.ts           # 6D matching algorithm & Dossier scoring
│   └── job-sources/          # Discovery engine
│       ├── agent.ts          # Dossier-inspired job discovery coordinator
│       ├── scheduler.ts      # Background refresh scheduler
│       ├── normalizer.ts     # Salary, location & fresher normalizers
│       ├── ats/              # 11 public ATS adapters
│       └── discovery/        # Web career-page crawler & JSON-LD parser
├── src/                      # React frontend SPA
│   ├── components/           # UI views (Dashboard, Discover, Settings, etc.)
│   ├── types/                # TypeScript interfaces
│   └── api/                  # Frontend API client
└── server.ts                 # Main Express server entrypoint
```

---

## 📬 Submitting a Pull Request

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit them with descriptive commit messages.
3. Verify all tests and lints pass.
4. Push your branch to GitHub and open a Pull Request using the provided PR template.

Thank you for helping build an open, accessible, and ethical job search engine!
