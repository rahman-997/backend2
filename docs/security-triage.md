# Security triage — Sessions 4–5

Automated Semgrep, CodeQL and dependency-audit workflows run on pull requests and `main`. This engineering triage records the concrete risks addressed while reconciling the course requirements with the existing Eventify repository.

| Finding | Source | Verdict | Why |
|---|---|---|---|
| Public signup accepted a client-supplied role | security review / mass-assignment check | fixed | Signup is now a strict allowlist and the repository always creates `ATTENDEE`. |
| Passwords used the older scrypt implementation instead of the course Argon2id baseline | security review | fixed | New hashes use Argon2id; successful legacy logins migrate transparently. |
| Auth rate limiting lived in one Node process | architecture/security review | fixed | Counters now live in shared Redis and work across replicas. |
| Refresh-token replay revoked only the presented token | authorization/session review | fixed | Replay now revokes the replacement chain before returning the same generic 401. |
| Cache entries could become immortal if a write omitted expiration | Session 5 cache review | fixed | Cache writes go through one helper that always supplies an explicit TTL. |
| Free production Redis is ephemeral | infrastructure review | accepted-risk | PostgreSQL remains source of truth and a durable outbox re-dispatches stale ENQUEUED/PENDING jobs after Redis restarts. |
| SMTP credentials are absent from the repository | secret scanning / configuration review | accepted-risk | Production defaults to log transport; real SMTP must be injected as a secret, never committed. |

Scanner categories have different blind spots: pattern/SAST tools can catch known unsafe primitives, while ownership, cache invalidation and transaction semantics require project-aware review. A clean result from one scanner is not a security proof.
