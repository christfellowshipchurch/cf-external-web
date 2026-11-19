# Security policy

## Reporting a vulnerability

Please don't report security problems in a public issue, pull request or discussion. Use this repository's **Security** tab and choose **Report a vulnerability**, so the report stays private between you and the maintainers. Include what you found, how to reproduce it and what it could expose.

## Security review guidelines

These are for code reviewers, human and AI (Codex security review reads this file). `AGENTS.md` has the repository's general review rules; this file covers what makes a change a security risk.

This is a public website. It reads content and sends form submissions to the church's management system. It has no user accounts or sessions: every call to that system runs server-side as one service account, so the server's own checks are the only protection on public endpoints.

Flag a change that:

- Lets an API token, session or encryption secret, or other credential reach the browser: returned from a loader or action, imported into client code, or written to a log. Only keys that are explicitly meant for the browser may appear there.
- Imports server-only code into a module that is bundled for the browser.
- Puts form, URL or cookie input into a query sent to a backend without trimming and validating it first (type, length, allowed characters).
- Renders HTML from the CMS or from users without sanitizing it.
- Adds a public form without the existing bot protection, or sends a form value upstream without checking it is present and valid.
- Adds sign-in or sessions without `HttpOnly`, `Secure` and `SameSite` cookies, expiry checks on tokens, hashed codes and passwords, and rate limits on login and code endpoints. Any such change is high risk and needs its own review.
- Redirects to a URL taken from the request without restricting it to this site.
- Fetches or frames another site's pages without an allow-list of scheme and host.
- Exposes an admin or webhook endpoint without checking its shared secret.
- Logs names, email addresses, phone numbers, passwords, cookies or query filter strings. Log ids and timings instead.
- Removes or loosens security headers (they live in `netlify.toml` only).
- Adds a redirect to only one of the two hosting configs (`vercel.json` and `netlify.toml`).
- Adds a dependency that is unmaintained, unpinned in the lockfile, or much broader than the problem it solves.

### Severity

- **High:** exposes a secret or someone's personal data, or lets anyone write to the management system without the intended checks.
- **Medium:** a weakness that needs another flaw or unusual conditions to exploit, such as an input check that is loose but still blocks the obvious attack.
- **Low:** hardening that reduces risk but fixes no reachable problem.
