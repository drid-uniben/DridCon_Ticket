# Security Policy

This project takes security seriously. If you believe you’ve found a security vulnerability, please report it **privately**.

## Reporting a vulnerability (private)

Preferred:

1. Go to the repository’s **Security** tab.
2. Click **Report a vulnerability**.
3. Submit a private report (GitHub Security Advisory).

If private vulnerability reporting is not enabled on the repository, do **not** open a public GitHub issue with exploit details. Instead:

- Contact the maintainers privately via GitHub (e.g., the repository owner/maintainers’ profiles), and share a short summary + reproduction steps.

## What to include

Please include as much of the following as possible:

- A clear description of the vulnerability and its impact
- Affected component(s): `client/`, `server/`, CI/workflows
- Steps to reproduce (or a proof-of-concept)
- Any relevant logs, request/response examples, or screenshots
- Whether the issue is reliably reproducible
- Suggested mitigation/fix (if you have one)

## Scope

In-scope examples for this repo include (but are not limited to):

- Authentication / authorization issues (role escalation: Admin/Agent/User)
- Token and cookie handling (JWT access/refresh, cookie flags, session fixation)
- CORS and cross-site request handling
- File upload handling (type/size validation, path traversal, unsafe file exposure)
- QR code token generation/verification and replay/tamper resistance
- Injection issues (NoSQL injection, command injection)
- Sensitive data exposure (PII, credentials, secrets, logs)
- GitHub Actions/workflow security issues (token leakage, unsafe `curl`/`jq` usage, permissions)

Out-of-scope (unless it results in a real security impact):

- Purely theoretical issues without a plausible exploit
- Low-severity UX issues that don’t expose data or change authorization
- Social engineering attempts against maintainers/contributors

## Supported versions

Security fixes are applied to the default development branch (`dev`).

## Coordinated disclosure

- Please keep vulnerability details private until a fix is released or maintainers confirm it’s safe to disclose.
- We’ll acknowledge receipt and work with you on a reasonable timeline for verification and release.

## Safe testing guidelines

When validating a vulnerability:

- Do not run denial-of-service tests against shared/public environments.
- Do not access or modify real user data.
- Use test accounts and local/dev environments whenever possible.

Thank you for helping keep the project and its users safe.
