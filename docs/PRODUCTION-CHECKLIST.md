# Production Checklist

- [ ] PostgreSQL backup/restore procedure documented
- [ ] `DATABASE_URL` supplied through secrets, never committed
- [ ] `NODE_ENV=production`
- [ ] CORS restricted to known origins
- [ ] TLS terminated at the deployment edge
- [ ] `/health` monitored
- [ ] `/ready` monitored separately
- [ ] graceful SIGTERM shutdown verified
- [ ] rate limiting configured for production traffic
- [ ] structured request IDs and logs collected
- [ ] migrations run as a deployment step
- [ ] `synchronize` disabled for ORM integrations
- [ ] CI typecheck/build/test/audit/Docker all green
- [ ] dependency update policy established
- [ ] PostgreSQL backup retention configured
- [ ] database connection pool sized for deployment
- [ ] error responses do not expose stack traces or secrets
- [ ] OpenAPI reviewed and published
