# Security Policy

## Supported version

Security fixes target the current `main` branch and the latest tagged release.

## Reporting

Do not open a public issue containing credentials, exploitable secrets, private data, or detailed instructions for an unpatched vulnerability. Use GitHub's private vulnerability reporting feature when enabled for this repository, or contact the repository owner privately.

Include the affected endpoint/component, reproduction conditions, expected impact, and a minimal proof of concept when safe to share.

## Operational rules

- Never commit `.env` files, database dumps, API keys, passwords, or production connection strings.
- PostgreSQL credentials must come from deployment secrets.
- Keep TypeORM `synchronize` disabled in production.
- SQL migrations are the canonical production schema changes.
- Restrict `CORS_ORIGIN` in production instead of using `*`.
- Terminate TLS at the deployment edge and expose the API through HTTPS.
- Monitor `/health` and `/ready` separately.
- Test backups by performing restore drills in a non-production environment.
- Treat dependency-audit and CI failures as release blockers.
