# Security Policy

## Supported version

Security fixes target the current `main` branch and the latest tagged release.

## Reporting

Do not open a public issue containing credentials, exploitable secrets, private data, or detailed instructions for an unpatched vulnerability. Use GitHub's private vulnerability reporting feature when enabled for this repository, or contact the repository owner privately.

Include the affected endpoint/component, reproduction conditions, expected impact, and a minimal proof of concept when safe to share.

## Operational rules

- Never commit `.env` files, database dumps, API keys, passwords, or production connection strings.
- `DATABASE_URL` and `MYSQL_URL` must come from deployment secrets.
- Use a dedicated least-privilege database user for each production deployment; do not use root/superuser credentials for the API.
- Deploy one runtime storage adapter per API process (`postgres` or `mysql`).
- Keep TypeORM `synchronize` disabled in production.
- Do not let Prisma, Drizzle, or TypeORM mutate production schema automatically.
- Apply only reviewed, versioned SQL migrations before application startup.
- Restrict `CORS_ORIGIN` in production instead of using `*`.
- Terminate TLS at the deployment edge and expose the API through HTTPS.
- Use encrypted database transport when the database is outside the trusted private network.
- Monitor `/health` and `/ready` separately.
- Test PostgreSQL/MySQL backups by performing restore drills in a non-production environment.
- Protect backup files as sensitive data and encrypt them at rest/off-site.
- Treat dependency-audit, schema-contract, E2E, and CI failures as release blockers.
