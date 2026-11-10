# Security Policy

## Supported Versions

Only the latest release of JobPilot AI receives active security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🔒 Security Architecture

JobPilot AI is designed for privacy-preserving self-hosting:

- **Local Storage**: All job opportunities, application records, candidate resumes, and personal notes are stored locally in a persistent SQLite database.
- **Zero Third-Party Telemetry**: JobPilot AI contains no tracking scripts, third-party analytics, or background telemetry.
- **Strict Network Isolation**: ATS discovery makes direct HTTP calls to employer job boards without passing through proprietary intermediate proxies.
- **Prepared Statements**: All database operations use SQLite prepared statements with parameter binding to prevent SQL injection vulnerabilities.
- **Secure File Ingestion**: Uploaded resumes undergo strict MIME type and file size validation (max 10MB) before text extraction.
- **HTTP Security Headers**: Embedded middleware enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, and CSP controls.
- **Rate Limiting**: Built-in sliding window rate limiter protects local endpoints against request exhaustion.

---

## 🚨 Reporting a Vulnerability

If you discover a potential security vulnerability in JobPilot AI, please **do not** open a public issue.

Instead, please email the maintainers or report it privately through GitHub's Private Vulnerability Reporting feature.

Please include:
- A description of the vulnerability.
- Steps to reproduce or a minimal proof-of-concept.
- The affected component or endpoint.

We will acknowledge receipt within 48 hours and work on a fix promptly.

