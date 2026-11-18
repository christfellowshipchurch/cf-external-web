# Security policy

## Reporting a vulnerability

Please don't report security problems in a public issue, pull request or discussion. Use this repository's **Security** tab and choose **Report a vulnerability**, so the report stays private between you and the maintainers. Include what you found, how to reproduce it and what it could expose.

## Security review guidelines

These are for code reviewers, human and AI (Codex security review reads this file). `AGENTS.md` has the repository's general review rules; this file covers what makes a change a security risk.

This is a public website. It reads content and sends form submissions to the church's management system, and lets people sign in with email or SMS.

Flag a change that:

- Lets an API token, session or encryption secret, or other credential reach the browser: returned from a loader or action, imported into client code, or written to a log. Only keys that are explicitly meant for the browser may appear there.
- Imports server-only code into a module that is bundled for the browser.
- Puts form, URL or cookie input into a query sent to a backend without trimming and validating it first (type, length, allowed characters).
- Renders HTML from the CMS or from users without sanitizing it.
- Adds a public form without the existing bot protection, or sends a form value upstream without checking it is present and valid.
- Weakens sign-in: session cookies without `HttpOnly`, `Secure` and `SameSite`, tokens accepted without checking expiry, codes or passwords stored or compared in plain text, login or code endpoints without rate limiting, or a phone number sent to an SMS provider before it is validated.
- Redirects to a URL taken from the request without restricting it to this site.
- Fetches or frames another site's pages without an allow-list of scheme and host.
- Exposes an admin or webhook endpoint without checking its shared secret.
- Logs names, email addresses, phone numbers, passwords, cookies or query filter strings. Log ids and timings instead.
- Removes or loosens security headers, or adds a redirect or header to only one of the two hosting configs.
- Adds a dependency that is unmaintained, unpinned in the lockfile, or much broader than the problem it solves.

### Severity

- **High:** exposes a secret or someone's personal data, lets a person act as someone else, or lets anyone write to the management system without the intended checks.
- **Medium:** a weakness that needs another flaw or unusual conditions to exploit, such as a missing input check behind sign-in.
- **Low:** hardening that reduces risk but fixes no reachable problem.
